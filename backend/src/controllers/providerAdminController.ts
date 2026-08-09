import { Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import Garage from '../models/Garage';
import ServiceProvider from '../models/ServiceProvider';
import ServicePayout from '../models/ServicePayout';
import User from '../models/User';
import {
  GarageVerificationStatus,
  ProviderType,
  ProviderVettingStatus,
  ServicePayoutStatus,
  UserRole,
} from '../types/shared';
import { countActiveAssignmentsForProvider } from '../utils/serviceProviderAssignment';
import { parsePagination, createPaginationResponse } from '../utils/pagination';
import { hashPassword } from '../utils/password';
import { emailService } from '../services/emailService';

export const listGarages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });
    const q: Record<string, unknown> = {};
    if (search && typeof search === 'string') {
      const r = new RegExp(search, 'i');
      q.$or = [{ name: r }, { town: r }, { contactPhone: r }];
    }
    const [items, total] = await Promise.all([
      Garage.find(q).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Garage.countDocuments(q),
    ]);
    res.json({ garages: items, pagination: createPaginationResponse(page, limit, total) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to list garages' });
  }
};

export const createGarage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, contactPhone, email, town, addressLine, verificationStatus, notes } = req.body;
    if (!name || !contactPhone || !town) {
      res.status(400).json({ message: 'name, contactPhone, and town are required' });
      return;
    }
    const g = await Garage.create({
      name,
      contactPhone,
      email,
      town,
      addressLine,
      verificationStatus: verificationStatus || GarageVerificationStatus.PENDING,
      notes,
    });
    res.status(201).json(g);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to create garage' });
  }
};

export const updateGarage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const g = await Garage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!g) {
      res.status(404).json({ message: 'Garage not found' });
      return;
    }
    res.json(g);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to update garage' });
  }
};

export const deleteGarage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const n = await ServiceProvider.countDocuments({ garage: req.params.id });
    if (n > 0) {
      res.status(400).json({ message: 'Cannot delete garage with linked providers' });
      return;
    }
    const g = await Garage.findByIdAndDelete(req.params.id);
    if (!g) {
      res.status(404).json({ message: 'Garage not found' });
      return;
    }
    res.json({ message: 'Garage deleted' });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to delete garage' });
  }
};

export const listServiceProviders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, providerType, vettingStatus, garageId, includeWorkload } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });
    const q: Record<string, unknown> = {};
    if (providerType && (providerType === 'driver' || providerType === 'mechanic')) {
      q.providerType = providerType;
    }
    if (vettingStatus && Object.values(ProviderVettingStatus).includes(vettingStatus as ProviderVettingStatus)) {
      q.vettingStatus = vettingStatus;
    }
    if (garageId && mongoose.Types.ObjectId.isValid(String(garageId))) {
      q.garage = garageId;
    }
    if (search && typeof search === 'string') {
      const r = new RegExp(search, 'i');
      q.$or = [{ name: r }, { phone: r }, { whatsAppPhone: r }];
    }
    const [items, total] = await Promise.all([
      ServiceProvider.find(q)
        .populate('garage', 'name town verificationStatus')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ServiceProvider.countDocuments(q),
    ]);
    let withWorkload = items;
    if (includeWorkload === 'true') {
      withWorkload = await Promise.all(
        items.map(async (p: any) => ({
          ...p,
          activeAssignmentCount: await countActiveAssignmentsForProvider(
            p._id,
            p.providerType as ProviderType
          ),
        }))
      );
    }
    res.json({ providers: withWorkload, pagination: createPaginationResponse(page, limit, total) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to list providers' });
  }
};

export const listProvidersForAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { providerType } = req.query;
    if (providerType !== 'driver' && providerType !== 'mechanic') {
      res.status(400).json({ message: 'providerType must be driver or mechanic' });
      return;
    }
    const items = await ServiceProvider.find({
      providerType,
      vettingStatus: ProviderVettingStatus.VETTED,
      active: true,
    })
      .populate('garage', 'name town verificationStatus')
      .sort({ name: 1 })
      .lean();
    const withWorkload = await Promise.all(
      items.map(async (p: any) => ({
        ...p,
        activeAssignmentCount: await countActiveAssignmentsForProvider(
          p._id,
          p.providerType as ProviderType
        ),
      }))
    );
    res.json({ providers: withWorkload });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to list providers' });
  }
};

export const createServiceProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      garage,
      name,
      phone,
      whatsAppPhone,
      providerType,
      vettingStatus,
      active,
      certificationNote,
    } = req.body;
    if (!garage || !name || !phone || !providerType) {
      res.status(400).json({ message: 'garage, name, phone, and providerType are required' });
      return;
    }
    if (!Object.values(ProviderType).includes(providerType)) {
      res.status(400).json({ message: 'Invalid providerType' });
      return;
    }
    const g = await Garage.findById(garage);
    if (!g) {
      res.status(400).json({ message: 'Garage not found' });
      return;
    }
    const p = await ServiceProvider.create({
      garage,
      name,
      phone,
      whatsAppPhone,
      providerType,
      vettingStatus: vettingStatus || ProviderVettingStatus.PENDING_REVIEW,
      active: active !== false,
      certificationNote,
    });
    const populated = await ServiceProvider.findById(p._id).populate('garage', 'name town verificationStatus');
    res.status(201).json(populated);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to create provider' });
  }
};

export const updateServiceProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.body.garage) {
      const g = await Garage.findById(req.body.garage);
      if (!g) {
        res.status(400).json({ message: 'Garage not found' });
        return;
      }
    }
    const p = await ServiceProvider.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('garage', 'name town verificationStatus');
    if (!p) {
      res.status(404).json({ message: 'Provider not found' });
      return;
    }
    res.json(p);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to update provider' });
  }
};

export const inviteServiceProviderAsMechanic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
      res.status(404).json({ message: 'Provider not found' });
      return;
    }
    if (provider.vettingStatus !== ProviderVettingStatus.VETTED) {
      res.status(400).json({ message: 'Only a vetted provider can be invited' });
      return;
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const alreadyLinked = await User.findOne({ serviceProvider: provider._id });
    if (alreadyLinked) {
      res.status(400).json({ message: 'This provider already has a mechanic account' });
      return;
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      res.status(400).json({ message: 'A user with this email already exists' });
      return;
    }

    const placeholderPassword = await hashPassword(crypto.randomBytes(32).toString('hex'));
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    const user = await User.create({
      email,
      password: placeholderPassword,
      name: provider.name,
      phone: provider.phone,
      role: UserRole.MECHANIC,
      serviceProvider: provider._id,
      resetToken,
      resetTokenExpiry,
    });

    const setPasswordUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await emailService.sendMechanicInviteEmail(email, provider.name, setPasswordUrl);

    res.status(201).json({
      message: 'Invite sent',
      user: { _id: user._id, email: user.email, role: user.role, serviceProvider: user.serviceProvider },
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to invite provider' });
  }
};

export const listAdminPayouts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });
    const q: Record<string, unknown> = {};
    if (status && Object.values(ServicePayoutStatus).includes(status as ServicePayoutStatus)) {
      q.status = status;
    }
    const [items, total] = await Promise.all([
      ServicePayout.find(q)
        .populate('garage', 'name town')
        .populate('provider', 'name phone providerType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ServicePayout.countDocuments(q),
    ]);
    res.json({ payouts: items, pagination: createPaginationResponse(page, limit, total) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to list payouts' });
  }
};

export const markPayoutPaid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await ServicePayout.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Payout not found' });
      return;
    }
    if (existing.status === ServicePayoutStatus.VOIDED) {
      res.status(400).json({
        message: 'This payout was voided (service was cancelled and refunded) and cannot be marked paid',
      });
      return;
    }

    // Atomic guard: only transition PENDING -> PAID. Prevents paying an
    // already-PAID payout again, or one that got voided in the same window.
    const p = await ServicePayout.findOneAndUpdate(
      { _id: req.params.id, status: ServicePayoutStatus.PENDING },
      { status: ServicePayoutStatus.PAID, paidAt: new Date() },
      { new: true }
    );
    if (!p) {
      res.status(409).json({ message: 'This payout is no longer pending' });
      return;
    }
    res.json(p);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to update payout' });
  }
};
