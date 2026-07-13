import { useMemo, useState } from 'react';
import {
  useGetAllCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  type Coupon,
} from '../../store/api/couponApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { useAdminListQueryOptions } from '../../hooks/useAdminListQueryOptions';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, Body } from '../../components/ui/Typography';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import {
  Plus,
  Loader2,
  Search,
  Tag,
  Pencil,
  Trash2,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

type CouponType = Coupon['type'];
type ActiveFilter = 'all' | 'active' | 'inactive';

interface CouponFormState {
  code: string;
  type: CouponType;
  value: string;
  minOrderValue: string;
  maxDiscount: string;
  validFrom: string;
  validTo: string;
  usageLimit: string;
  userLimit: string;
  active: boolean;
}

const emptyForm = (): CouponFormState => {
  const today = new Date();
  const inThirtyDays = new Date(today);
  inThirtyDays.setDate(today.getDate() + 30);
  return {
    code: '',
    type: 'fixed',
    value: '',
    minOrderValue: '',
    maxDiscount: '',
    validFrom: toDateInput(today.toISOString()),
    validTo: toDateInput(inThirtyDays.toISOString()),
    usageLimit: '',
    userLimit: '',
    active: true,
  };
};

function toDateInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatDateDisplay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDiscount(coupon: Coupon): string {
  if (coupon.type === 'percentage') return `${coupon.value}%`;
  if (coupon.type === 'fixed') return `MWK ${coupon.value.toLocaleString()}`;
  return 'Free shipping';
}

function couponToForm(coupon: Coupon): CouponFormState {
  return {
    code: coupon.code,
    type: coupon.type,
    value: String(coupon.value ?? ''),
    minOrderValue: coupon.minOrderValue != null ? String(coupon.minOrderValue) : '',
    maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : '',
    validFrom: toDateInput(coupon.validFrom),
    validTo: toDateInput(coupon.validTo),
    usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
    userLimit: coupon.userLimit != null ? String(coupon.userLimit) : '',
    active: coupon.active,
  };
}

function formToPayload(form: CouponFormState): Partial<Coupon> {
  const value = Number(form.value);
  const payload: Partial<Coupon> = {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: Number.isFinite(value) ? value : 0,
    validFrom: new Date(`${form.validFrom}T00:00:00.000Z`).toISOString(),
    validTo: new Date(`${form.validTo}T23:59:59.999Z`).toISOString(),
    active: form.active,
  };

  if (form.minOrderValue.trim()) {
    payload.minOrderValue = Number(form.minOrderValue);
  } else {
    payload.minOrderValue = 0;
  }

  if (form.type === 'percentage' && form.maxDiscount.trim()) {
    payload.maxDiscount = Number(form.maxDiscount);
  }

  if (form.usageLimit.trim()) {
    payload.usageLimit = Number(form.usageLimit);
  }

  if (form.userLimit.trim()) {
    payload.userLimit = Number(form.userLimit);
  }

  return payload;
}

export const AdminCoupons = () => {
  const dispatch = useAppDispatch();
  const adminListQueryOptions = useAdminListQueryOptions();
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const activeQuery =
    activeFilter === 'all' ? undefined : activeFilter === 'active';

  const { data, isLoading, refetch } = useGetAllCouponsQuery(
    { page, limit: 20, active: activeQuery },
    adminListQueryOptions
  );
  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const [deleteCoupon, { isLoading: isDeleting }] = useDeleteCouponMutation();

  const coupons = useMemo(() => {
    const list = data?.coupons ?? [];
    const q = searchTerm.trim().toUpperCase();
    if (!q) return list;
    return list.filter((c) => c.code.includes(q));
  }, [data?.coupons, searchTerm]);

  const pagination = data?.pagination;
  const saving = isCreating || isUpdating;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setForm(couponToForm(coupon));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      dispatch(showNotification({ message: 'Coupon code is required', type: 'error' }));
      return;
    }
    if (!form.validFrom || !form.validTo) {
      dispatch(showNotification({ message: 'Valid from and valid to dates are required', type: 'error' }));
      return;
    }
    if (form.type !== 'free-shipping' && (!form.value.trim() || Number(form.value) < 0)) {
      dispatch(showNotification({ message: 'Enter a valid discount value', type: 'error' }));
      return;
    }
    if (form.type === 'percentage' && Number(form.value) > 100) {
      dispatch(showNotification({ message: 'Percentage must be between 0 and 100', type: 'error' }));
      return;
    }

    const payload = formToPayload(form);
    if (form.type === 'free-shipping') {
      payload.value = 0;
    }

    try {
      if (editing) {
        await updateCoupon({ id: editing._id, data: payload }).unwrap();
        dispatch(showNotification({ message: 'Coupon updated', type: 'success' }));
      } else {
        await createCoupon(payload).unwrap();
        dispatch(showNotification({ message: 'Coupon created', type: 'success' }));
      }
      closeForm();
      await refetch();
    } catch (error: unknown) {
      const errorInfo = getErrorInfo(error, 'Failed to save coupon');
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await updateCoupon({
        id: coupon._id,
        data: { active: !coupon.active },
      }).unwrap();
      dispatch(
        showNotification({
          message: coupon.active ? 'Coupon deactivated' : 'Coupon activated',
          type: 'success',
        })
      );
      await refetch();
    } catch (error: unknown) {
      const errorInfo = getErrorInfo(error, 'Failed to update coupon');
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCoupon(deleteTarget._id).unwrap();
      dispatch(showNotification({ message: 'Coupon deleted', type: 'success' }));
      setDeleteTarget(null);
      await refetch();
    } catch (error: unknown) {
      const errorInfo = getErrorInfo(error, 'Failed to delete coupon');
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <H1 className="text-3xl font-bold text-gray-50 mb-2">Coupons</H1>
          <Body className="text-gray-400">
            Manage promo codes. Usage counts increase only after successful payment.
          </Body>
        </div>
        <Button onClick={openCreate} dark>
          <Plus className="h-5 w-5 mr-2" />
          Add Coupon
        </Button>
      </div>

      <AdminCard variant="default" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as ActiveFilter);
              setPage(1);
            }}
            className="w-full px-4 py-2 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
      </AdminCard>

      <AdminCard variant="default">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <Body className="text-gray-400">No coupons found</Body>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Discount</th>
                  <th className="py-3 px-3">Usage</th>
                  <th className="py-3 px-3">Valid</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-b border-gray-800 hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <Body className="font-semibold text-gray-50">{coupon.code}</Body>
                      <Body className="text-xs text-gray-500 capitalize">{coupon.type.replace('-', ' ')}</Body>
                    </td>
                    <td className="py-3 px-3 text-gray-200">{formatDiscount(coupon)}</td>
                    <td className="py-3 px-3 text-gray-200">
                      {coupon.usageCount}
                      {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ' / unlimited'}
                    </td>
                    <td className="py-3 px-3 text-gray-300 text-sm">
                      {formatDateDisplay(coupon.validFrom)} – {formatDateDisplay(coupon.validTo)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          coupon.active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {coupon.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="small"
                          dark
                          type="button"
                          onClick={() => void handleToggleActive(coupon)}
                          title={coupon.active ? 'Deactivate' : 'Activate'}
                        >
                          {coupon.active ? (
                            <ToggleRight className="h-4 w-4 text-teal-400" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          dark
                          type="button"
                          onClick={() => openEdit(coupon)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          dark
                          type="button"
                          onClick={() => setDeleteTarget(coupon)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <Body className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </Body>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="small"
                dark
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="small"
                dark
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </AdminCard>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg bg-slate-800 border border-gray-700 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <H1 className="text-xl text-gray-50">{editing ? 'Edit Coupon' : 'New Coupon'}</H1>
              <button type="button" onClick={closeForm} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <Input
                label="Code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SAVE10"
                dark
                disabled={Boolean(editing)}
              />
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType }))}
                  className="w-full px-4 py-2 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="fixed">Fixed (MWK)</option>
                  <option value="percentage">Percentage</option>
                  <option value="free-shipping">Free shipping</option>
                </select>
              </div>
              {form.type !== 'free-shipping' && (
                <Input
                  label={form.type === 'percentage' ? 'Value (%)' : 'Value (MWK)'}
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  dark
                />
              )}
              {form.type === 'percentage' && (
                <Input
                  label="Max discount (MWK, optional)"
                  type="number"
                  value={form.maxDiscount}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                  dark
                />
              )}
              <Input
                label="Minimum order (MWK)"
                type="number"
                value={form.minOrderValue}
                onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                dark
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Valid from"
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                  dark
                />
                <Input
                  label="Valid to"
                  type="date"
                  value={form.validTo}
                  onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))}
                  dark
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Total usage limit"
                  type="number"
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="Unlimited"
                  dark
                />
                <Input
                  label="Per-user limit"
                  type="number"
                  value={form.userLimit}
                  onChange={(e) => setForm((f) => ({ ...f, userLimit: e.target.value }))}
                  placeholder="Unlimited"
                  dark
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="rounded border-gray-600 text-teal-500 focus:ring-teal-500"
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
              <Button variant="secondary" dark type="button" onClick={closeForm}>
                Cancel
              </Button>
              <Button variant="primary" dark type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editing ? 'Save changes' : 'Create coupon'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete coupon"
        message={
          deleteTarget
            ? `Delete coupon ${deleteTarget.code}? This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        dark
        isLoading={isDeleting}
      />
    </div>
  );
};
