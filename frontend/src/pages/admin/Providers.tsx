import { useState } from 'react';
import {
  useGetGaragesQuery,
  useCreateGarageMutation,
  useGetServiceProvidersQuery,
  useCreateServiceProviderMutation,
  useUpdateServiceProviderMutation,
  useGetServicePayoutsQuery,
  useMarkServicePayoutPaidMutation,
  type AdminGarage,
} from '../../store/api/adminApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { H1, Body } from '../../components/ui/Typography';
import { Building2, Loader2, Save, Users, Wrench, Truck, Banknote, CheckCircle } from 'lucide-react';
import { useAdminListQueryOptions } from '../../hooks/useAdminListQueryOptions';

type Tab = 'garages' | 'drivers' | 'mechanics' | 'payouts';

export const AdminProviders = () => {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>('garages');
  const [garageModal, setGarageModal] = useState(false);
  const [providerModal, setProviderModal] = useState(false);
  const [providerModalRole, setProviderModalRole] = useState<'driver' | 'mechanic'>('driver');
  const [garageForm, setGarageForm] = useState({
    name: '',
    contactPhone: '',
    town: '',
    email: '',
    verificationStatus: 'pending',
  });
  const [providerForm, setProviderForm] = useState({
    garage: '',
    name: '',
    phone: '',
    whatsAppPhone: '',
    vettingStatus: 'pending_review',
    certificationNote: '',
  });

  const adminListQueryOptions = useAdminListQueryOptions();

  const { data: garagesData, refetch: refetchGarages } = useGetGaragesQuery(
    { limit: 100 },
    adminListQueryOptions
  );
  const { data: driversData, refetch: refetchDrivers } = useGetServiceProvidersQuery(
    {
      providerType: 'driver',
      includeWorkload: true,
      limit: 100,
    },
    adminListQueryOptions
  );
  const { data: mechanicsData, refetch: refetchMechanics } = useGetServiceProvidersQuery(
    {
      providerType: 'mechanic',
      includeWorkload: true,
      limit: 100,
    },
    adminListQueryOptions
  );
  const { data: payoutsData, refetch: refetchPayouts } = useGetServicePayoutsQuery(
    { limit: 50 },
    adminListQueryOptions
  );

  const [createGarage, { isLoading: creatingG }] = useCreateGarageMutation();
  const [createProvider, { isLoading: creatingP }] = useCreateServiceProviderMutation();
  const [updateProvider, { isLoading: updatingP }] = useUpdateServiceProviderMutation();
  const [markPaid, { isLoading: marking }] = useMarkServicePayoutPaidMutation();

  const openProviderModal = (role: 'driver' | 'mechanic') => {
    setProviderModalRole(role);
    setProviderForm({
      garage: '',
      name: '',
      phone: '',
      whatsAppPhone: '',
      vettingStatus: 'pending_review',
      certificationNote: '',
    });
    setProviderModal(true);
  };

  const handleCreateGarage = async () => {
    if (!garageForm.name.trim() || !garageForm.contactPhone.trim() || !garageForm.town.trim()) {
      dispatch(showNotification({ message: 'Name, contact phone, and town are required', type: 'error' }));
      return;
    }
    try {
      await createGarage({
        name: garageForm.name.trim(),
        contactPhone: garageForm.contactPhone.trim(),
        town: garageForm.town.trim(),
        email: garageForm.email.trim() || undefined,
        verificationStatus: garageForm.verificationStatus as AdminGarage['verificationStatus'],
      }).unwrap();
      dispatch(showNotification({ message: 'Garage created', type: 'success' }));
      setGarageModal(false);
      setGarageForm({ name: '', contactPhone: '', town: '', email: '', verificationStatus: 'pending' });
      await refetchGarages();
    } catch (e: unknown) {
      dispatch(showNotification({ message: getErrorInfo(e, 'Failed to create garage').message, type: 'error' }));
    }
  };

  const handleCreateProvider = async () => {
    const pt = providerModalRole;
    if (!providerForm.garage || !providerForm.name.trim() || !providerForm.phone.trim()) {
      dispatch(showNotification({ message: 'Garage, name, and phone are required', type: 'error' }));
      return;
    }
    try {
      await createProvider({
        garage: providerForm.garage,
        name: providerForm.name.trim(),
        phone: providerForm.phone.trim(),
        providerType: pt,
        whatsAppPhone: providerForm.whatsAppPhone.trim() || undefined,
        vettingStatus: providerForm.vettingStatus,
        certificationNote: providerForm.certificationNote.trim() || undefined,
      }).unwrap();
      dispatch(showNotification({ message: 'Provider created', type: 'success' }));
      setProviderModal(false);
      if (pt === 'driver') await refetchDrivers();
      else await refetchMechanics();
    } catch (e: unknown) {
      dispatch(showNotification({ message: getErrorInfo(e, 'Failed to create provider').message, type: 'error' }));
    }
  };

  const vetDriver = async (id: string) => {
    try {
      await updateProvider({ id, body: { vettingStatus: 'vetted', active: true } }).unwrap();
      dispatch(showNotification({ message: 'Provider marked as vetted', type: 'success' }));
      await refetchDrivers();
      await refetchMechanics();
    } catch (e: unknown) {
      dispatch(showNotification({ message: getErrorInfo(e, 'Update failed').message, type: 'error' }));
    }
  };

  const garages = garagesData?.garages ?? [];
  const drivers = driversData?.providers ?? [];
  const mechanics = mechanicsData?.providers ?? [];
  const payouts = payoutsData?.payouts ?? [];

  return (
    <div>
      <div className="mb-6">
        <H1 className="text-3xl font-bold text-gray-50 mb-2">Providers & Garages</H1>
        <Body className="text-gray-400">
          Register garages, vet drivers and mechanics, then assign them from Service Management.
        </Body>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ['garages', 'Garages', Building2],
            ['drivers', 'Drivers', Truck],
            ['mechanics', 'Mechanics', Wrench],
            ['payouts', 'Payouts (MWK)', Banknote],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-teal-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'garages' && (
        <AdminCard>
          <div className="flex justify-between items-center mb-4">
            <Body className="text-gray-300">Partner garages (verification before go-live)</Body>
            <Button variant="primary" size="small" dark onClick={() => setGarageModal(true)}>
              Add garage
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Town</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {garages.map((g) => (
                  <tr key={g._id} className="border-b border-gray-800">
                    <td className="py-2 pr-4 text-gray-100">{g.name}</td>
                    <td className="py-2 pr-4">{g.town}</td>
                    <td className="py-2 pr-4">{g.contactPhone}</td>
                    <td className="py-2 capitalize">{g.verificationStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {garages.length === 0 && <Body className="text-gray-500 py-4">No garages yet.</Body>}
          </div>
        </AdminCard>
      )}

      {tab === 'drivers' && (
        <AdminCard>
          <div className="flex justify-between items-center mb-4">
            <Body className="text-gray-300">Towing drivers (must be vetted before assignment)</Body>
            <Button variant="primary" size="small" dark onClick={() => openProviderModal('driver')}>
              Add driver
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Garage</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Vetting</th>
                  <th className="py-2 pr-4">Active jobs</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((p) => (
                  <tr key={p._id} className="border-b border-gray-800">
                    <td className="py-2 pr-4 text-gray-100">{p.name}</td>
                    <td className="py-2 pr-4">
                      {typeof p.garage === 'object' && p.garage ? p.garage.name : '—'}
                    </td>
                    <td className="py-2 pr-4">{p.phone}</td>
                    <td className="py-2 pr-4 capitalize">{p.vettingStatus}</td>
                    <td className="py-2 pr-4">{p.activeAssignmentCount ?? 0}</td>
                    <td className="py-2">
                      {p.vettingStatus !== 'vetted' && (
                        <Button
                          variant="outline"
                          size="small"
                          dark
                          type="button"
                          className="gap-1"
                          disabled={updatingP}
                          onClick={() => vetDriver(p._id)}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Mark vetted
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {drivers.length === 0 && <Body className="text-gray-500 py-4">No drivers yet.</Body>}
          </div>
        </AdminCard>
      )}

      {tab === 'mechanics' && (
        <AdminCard>
          <div className="flex justify-between items-center mb-4">
            <Body className="text-gray-300">Car service mechanics</Body>
            <Button variant="primary" size="small" dark onClick={() => openProviderModal('mechanic')}>
              Add mechanic
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Garage</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Vetting</th>
                  <th className="py-2 pr-4">Active jobs</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {mechanics.map((p) => (
                  <tr key={p._id} className="border-b border-gray-800">
                    <td className="py-2 pr-4 text-gray-100">{p.name}</td>
                    <td className="py-2 pr-4">
                      {typeof p.garage === 'object' && p.garage ? p.garage.name : '—'}
                    </td>
                    <td className="py-2 pr-4">{p.phone}</td>
                    <td className="py-2 pr-4 capitalize">{p.vettingStatus}</td>
                    <td className="py-2 pr-4">{p.activeAssignmentCount ?? 0}</td>
                    <td className="py-2">
                      {p.vettingStatus !== 'vetted' && (
                        <Button
                          variant="outline"
                          size="small"
                          dark
                          type="button"
                          className="gap-1"
                          disabled={updatingP}
                          onClick={() => vetDriver(p._id)}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Mark vetted
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mechanics.length === 0 && <Body className="text-gray-500 py-4">No mechanics yet.</Body>}
          </div>
        </AdminCard>
      )}

      {tab === 'payouts' && (
        <AdminCard>
          <Body className="text-gray-300 mb-4">
            Pending payouts are created when a customer completes payment and a provider was assigned.
          </Body>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-2 pr-4">Amount (MWK)</th>
                  <th className="py-2 pr-4">Garage</th>
                  <th className="py-2 pr-4">Kind</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p._id} className="border-b border-gray-800">
                    <td className="py-2 pr-4 text-teal-400 font-medium">{p.amountMwk.toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      {typeof p.garage === 'object' && p.garage ? p.garage.name : '—'}
                    </td>
                    <td className="py-2 pr-4">{p.serviceKind}</td>
                    <td className="py-2 pr-4 capitalize">{p.status}</td>
                    <td className="py-2">
                      {p.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="small"
                          dark
                          type="button"
                          disabled={marking}
                          onClick={async () => {
                            try {
                              await markPaid(p._id).unwrap();
                              dispatch(showNotification({ message: 'Marked as paid', type: 'success' }));
                              await refetchPayouts();
                            } catch (e: unknown) {
                              dispatch(
                                showNotification({
                                  message: getErrorInfo(e, 'Failed').message,
                                  type: 'error',
                                })
                              );
                            }
                          }}
                        >
                          Mark paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payouts.length === 0 && <Body className="text-gray-500 py-4">No payout records yet.</Body>}
          </div>
        </AdminCard>
      )}

      {garageModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card variant="lg" className="w-full max-w-md bg-slate-800 border border-gray-700 p-6">
            <H1 className="text-lg text-gray-50 mb-4">Add garage</H1>
            <div className="space-y-3">
              <Input
                dark
                placeholder="Name"
                value={garageForm.name}
                onChange={(e) => setGarageForm((s) => ({ ...s, name: e.target.value }))}
              />
              <Input
                dark
                placeholder="Contact phone"
                value={garageForm.contactPhone}
                onChange={(e) => setGarageForm((s) => ({ ...s, contactPhone: e.target.value }))}
              />
              <Input
                dark
                placeholder="Town / city"
                value={garageForm.town}
                onChange={(e) => setGarageForm((s) => ({ ...s, town: e.target.value }))}
              />
              <Input
                dark
                placeholder="Email (optional)"
                value={garageForm.email}
                onChange={(e) => setGarageForm((s) => ({ ...s, email: e.target.value }))}
              />
              <select
                value={garageForm.verificationStatus}
                onChange={(e) => setGarageForm((s) => ({ ...s, verificationStatus: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50"
              >
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="ghost" dark onClick={() => setGarageModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" dark onClick={handleCreateGarage} disabled={creatingG} className="gap-2">
                {creatingG ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}

      {providerModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card variant="lg" className="w-full max-w-md bg-slate-800 border border-gray-700 p-6">
            <H1 className="text-lg text-gray-50 mb-4">
              Add {providerModalRole === 'mechanic' ? 'mechanic' : 'driver'}
            </H1>
            <div className="space-y-3">
              <select
                value={providerForm.garage}
                onChange={(e) => setProviderForm((s) => ({ ...s, garage: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50"
              >
                <option value="">Select garage</option>
                {garages.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name} ({g.town})
                  </option>
                ))}
              </select>
              <Input
                dark
                placeholder="Full name"
                value={providerForm.name}
                onChange={(e) => setProviderForm((s) => ({ ...s, name: e.target.value }))}
              />
              <Input
                dark
                placeholder="Phone"
                value={providerForm.phone}
                onChange={(e) => setProviderForm((s) => ({ ...s, phone: e.target.value }))}
              />
              <Input
                dark
                placeholder="WhatsApp (optional)"
                value={providerForm.whatsAppPhone}
                onChange={(e) => setProviderForm((s) => ({ ...s, whatsAppPhone: e.target.value }))}
              />
              <select
                value={providerForm.vettingStatus}
                onChange={(e) => setProviderForm((s) => ({ ...s, vettingStatus: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50"
              >
                <option value="pending_review">Pending review</option>
                <option value="vetted">Vetted</option>
                <option value="suspended">Suspended</option>
              </select>
              <textarea
                placeholder="Certification notes (optional)"
                value={providerForm.certificationNote}
                onChange={(e) => setProviderForm((s) => ({ ...s, certificationNote: e.target.value }))}
                className="w-full min-h-[80px] px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 text-sm"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="ghost" dark onClick={() => setProviderModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" dark onClick={handleCreateProvider} disabled={creatingP} className="gap-2">
                {creatingP ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
