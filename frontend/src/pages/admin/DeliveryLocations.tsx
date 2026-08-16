import { useState } from 'react';
import {
  useGetDeliveryLocationsQuery,
  useCreateTownMutation,
  useUpdateTownMutation,
  useDeleteTownMutation,
  useCreateLandmarkMutation,
  useUpdateLandmarkMutation,
  useDeleteLandmarkMutation,
} from '../../store/api/deliveryLocationApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, H2, Body } from '../../components/ui/Typography';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  Building2,
  List,
} from 'lucide-react';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { AdminCard } from '../../components/ui/AdminCard';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

export const DeliveryLocations = () => {
  const dispatch = useAppDispatch();
  const { data, isLoading, isError } = useGetDeliveryLocationsQuery();

  const [createTown] = useCreateTownMutation();
  const [updateTown] = useUpdateTownMutation();
  const [deleteTown] = useDeleteTownMutation();
  const [createLandmark] = useCreateLandmarkMutation();
  const [updateLandmark] = useUpdateLandmarkMutation();
  const [deleteLandmark] = useDeleteLandmarkMutation();

  const [showAddTownModal, setShowAddTownModal] = useState(false);
  const [newTownName, setNewTownName] = useState('');
  const [newTownLandmarks, setNewTownLandmarks] = useState<string[]>(['']);
  const [newTownFee, setNewTownFee] = useState('');
  const [editingTown, setEditingTown] = useState<string | null>(null);
  const [editTownName, setEditTownName] = useState('');
  const [editTownFee, setEditTownFee] = useState('');
  const [editingLandmark, setEditingLandmark] = useState<{ townId: string; landmarkId: string } | null>(null);
  const [editLandmarkName, setEditLandmarkName] = useState('');
  const [newLandmarkName, setNewLandmarkName] = useState('');
  const [addingLandmarkTo, setAddingLandmarkTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTownTarget, setDeleteTownTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLandmarkTarget, setDeleteLandmarkTarget] = useState<{
    townId: string;
    landmarkId: string;
    landmarkName: string;
  } | null>(null);

  // Handle add town
  const handleAddTown = async () => {
    if (!newTownName.trim()) {
      dispatch(showNotification({ message: 'Town name is required', type: 'error' }));
      return;
    }

    const validLandmarks = newTownLandmarks.filter((l) => l.trim().length > 0);
    if (validLandmarks.length === 0) {
      dispatch(showNotification({ message: 'At least one landmark is required', type: 'error' }));
      return;
    }

    const parsedFee = newTownFee.trim() ? Number(newTownFee) : 0;
    if (Number.isNaN(parsedFee) || parsedFee < 0) {
      dispatch(showNotification({ message: 'Delivery fee must be a non-negative number', type: 'error' }));
      return;
    }

    try {
      await createTown({ town: newTownName.trim(), landmarks: validLandmarks, deliveryFee: parsedFee }).unwrap();
      dispatch(showNotification({ message: 'Town created successfully', type: 'success' }));
      setShowAddTownModal(false);
      setNewTownName('');
      setNewTownLandmarks(['']);
      setNewTownFee('');
    } catch (error: any) {
      dispatch(showNotification({ message: error.data?.message || 'Failed to create town', type: 'error' }));
    }
  };

  // Handle update town name and delivery fee
  const handleUpdateTown = async (townId: string) => {
    if (!editTownName.trim()) {
      dispatch(showNotification({ message: 'Town name cannot be empty', type: 'error' }));
      return;
    }

    const parsedFee = editTownFee.trim() ? Number(editTownFee) : 0;
    if (Number.isNaN(parsedFee) || parsedFee < 0) {
      dispatch(showNotification({ message: 'Delivery fee must be a non-negative number', type: 'error' }));
      return;
    }

    try {
      await updateTown({ id: townId, data: { town: editTownName.trim(), deliveryFee: parsedFee } }).unwrap();
      dispatch(showNotification({ message: 'Town updated successfully', type: 'success' }));
      setEditingTown(null);
      setEditTownName('');
      setEditTownFee('');
    } catch (error: any) {
      dispatch(showNotification({ message: error.data?.message || 'Failed to update town', type: 'error' }));
    }
  };

  // Handle delete town
  const handleDeleteTown = async () => {
    if (!deleteTownTarget) return;
    try {
      await deleteTown(deleteTownTarget.id).unwrap();
      dispatch(showNotification({ message: 'Town deleted successfully', type: 'success' }));
      setDeleteTownTarget(null);
    } catch (error: any) {
      dispatch(showNotification({ message: error.data?.message || 'Failed to delete town', type: 'error' }));
    }
  };

  // Handle add landmark
  const handleAddLandmark = async (townId: string) => {
    if (!newLandmarkName.trim()) {
      dispatch(showNotification({ message: 'Landmark name is required', type: 'error' }));
      return;
    }

    try {
      await createLandmark({ townId, data: { name: newLandmarkName.trim() } }).unwrap();
      dispatch(showNotification({ message: 'Landmark added successfully', type: 'success' }));
      setAddingLandmarkTo(null);
      setNewLandmarkName('');
    } catch (error: any) {
      dispatch(showNotification({ message: error.data?.message || 'Failed to add landmark', type: 'error' }));
    }
  };

  // Handle update landmark
  const handleUpdateLandmark = async (townId: string, landmarkId: string) => {
    if (!editLandmarkName.trim()) {
      dispatch(showNotification({ message: 'Landmark name cannot be empty', type: 'error' }));
      return;
    }

    try {
      await updateLandmark({
        townId,
        landmarkId,
        data: { name: editLandmarkName.trim() },
      }).unwrap();
      dispatch(showNotification({ message: 'Landmark updated successfully', type: 'success' }));
      setEditingLandmark(null);
      setEditLandmarkName('');
    } catch (error: any) {
      dispatch(showNotification({ message: error.data?.message || 'Failed to update landmark', type: 'error' }));
    }
  };

  // Handle delete landmark
  const handleDeleteLandmark = async () => {
    if (!deleteLandmarkTarget) return;
    try {
      await deleteLandmark({
        townId: deleteLandmarkTarget.townId,
        landmarkId: deleteLandmarkTarget.landmarkId,
      }).unwrap();
      dispatch(showNotification({ message: 'Landmark deleted successfully', type: 'success' }));
      setDeleteLandmarkTarget(null);
    } catch (error: any) {
      dispatch(showNotification({ message: error.data?.message || 'Failed to delete landmark', type: 'error' }));
    }
  };

  // Filter towns by search query
  const filteredLocations = data?.deliveryLocations.filter((location) =>
    location.town.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalTowns = data?.deliveryLocations.length || 0;
  const totalLandmarks =
    data?.deliveryLocations.reduce((sum, location) => sum + location.landmarks.length, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <H1 className="text-3xl font-bold text-gray-50 mb-2">Delivery Locations</H1>
          <Body className="text-gray-400">Manage towns and landmarks for Malawi delivery addresses</Body>
        </div>
        <AdminCard>
          <div className="flex items-center gap-3 text-red-300">
            <AlertCircle className="h-5 w-5" />
            <Body className="text-red-300">Failed to load delivery locations.</Body>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <H1 className="text-3xl font-bold text-gray-50 mb-2">Delivery Locations</H1>
        <Body className="text-gray-400">
          Manage towns and landmarks for Malawi delivery addresses
        </Body>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminCard variant="kpi" accentColor="teal">
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-400">Total Towns</Body>
              <H2 className="text-2xl font-bold text-gray-50">{totalTowns}</H2>
            </div>
            <Building2 className="h-6 w-6 text-teal-400" />
          </div>
        </AdminCard>
        <AdminCard variant="kpi" accentColor="blue">
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-400">Total Landmarks</Body>
              <H2 className="text-2xl font-bold text-gray-50">{totalLandmarks}</H2>
            </div>
            <MapPin className="h-6 w-6 text-blue-400" />
          </div>
        </AdminCard>
        <AdminCard variant="kpi" accentColor="purple">
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-400">Search Results</Body>
              <H2 className="text-2xl font-bold text-gray-50">{filteredLocations?.length || 0}</H2>
            </div>
            <List className="h-6 w-6 text-purple-400" />
          </div>
        </AdminCard>
      </div>

      {/* Search and Add */}
      <AdminCard className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              dark
              type="text"
              placeholder="Search towns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowAddTownModal(true)} className="md:w-auto w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Town
          </Button>
        </div>
      </AdminCard>

      {/* Towns List */}
      <div className="space-y-4">
        {filteredLocations?.length === 0 && (
          <AdminCard className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <H2 className="text-xl font-semibold text-gray-200 mb-2">No towns found</H2>
            <Body className="text-gray-400">
              Try a different search term or add a new town.
            </Body>
          </AdminCard>
        )}
        {filteredLocations?.map((location) => (
          <AdminCard key={location._id} className="space-y-4">
            {/* Town Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-teal-400" />
                {editingTown === location._id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      dark
                      value={editTownName}
                      onChange={(e) => setEditTownName(e.target.value)}
                      className="w-64"
                    />
                    <Input
                      dark
                      type="number"
                      min={0}
                      value={editTownFee}
                      onChange={(e) => setEditTownFee(e.target.value)}
                      placeholder="Delivery fee (MWK)"
                      className="w-40"
                    />
                    <Button size="sm" onClick={() => handleUpdateTown(location._id)}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingTown(null);
                        setEditTownName('');
                        setEditTownFee('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <H2 className="text-2xl font-bold text-gray-50">{location.town}</H2>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  MWK {location.deliveryFee.toLocaleString()} delivery &middot; {location.landmarks.length} landmarks
                </span>
                {!editingTown && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingTown(location._id);
                        setEditTownName(location.town);
                        setEditTownFee(String(location.deliveryFee));
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteTownTarget({ id: location._id, name: location.town })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Landmarks */}
            <div className="space-y-2">
              {location.landmarks.map((landmark) => (
                <div
                  key={landmark._id}
                  className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-gray-700"
                >
                  {editingLandmark?.landmarkId === landmark._id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        dark
                        value={editLandmarkName}
                        onChange={(e) => setEditLandmarkName(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateLandmark(location._id, landmark._id)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingLandmark(null);
                          setEditLandmarkName('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {landmark.active ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={landmark.active ? 'text-gray-100' : 'text-gray-500'}>
                          {landmark.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingLandmark({ townId: location._id, landmarkId: landmark._id });
                            setEditLandmarkName(landmark.name);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            setDeleteLandmarkTarget({
                              townId: location._id,
                              landmarkId: landmark._id,
                              landmarkName: landmark.name,
                            })
                          }
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add Landmark */}
              {addingLandmarkTo === location._id ? (
                <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-lg border border-teal-700/50">
                  <Input
                    dark
                    value={newLandmarkName}
                    onChange={(e) => setNewLandmarkName(e.target.value)}
                    placeholder="New landmark name"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleAddLandmark(location._id)}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setAddingLandmarkTo(null);
                      setNewLandmarkName('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setAddingLandmarkTo(location._id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Landmark
                </Button>
              )}
            </div>
          </AdminCard>
        ))}
      </div>

      {/* Add Town Modal */}
      {showAddTownModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <H2 className="text-2xl font-bold text-gray-900">Add New Town</H2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowAddTownModal(false);
                  setNewTownName('');
                  setNewTownLandmarks(['']);
                  setNewTownFee('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Town Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newTownName}
                  onChange={(e) => setNewTownName(e.target.value)}
                  placeholder="e.g., Lilongwe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Fee (MWK)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={newTownFee}
                  onChange={(e) => setNewTownFee(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Landmarks <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {newTownLandmarks.map((landmark, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={landmark}
                        onChange={(e) => {
                          const updated = [...newTownLandmarks];
                          updated[index] = e.target.value;
                          setNewTownLandmarks(updated);
                        }}
                        placeholder="e.g., Shoprite Mall"
                      />
                      {newTownLandmarks.length > 1 && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setNewTownLandmarks(newTownLandmarks.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNewTownLandmarks([...newTownLandmarks, ''])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Landmark
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddTownModal(false);
                  setNewTownName('');
                  setNewTownLandmarks(['']);
                  setNewTownFee('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddTown}>Create Town</Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteTownTarget}
        onClose={() => setDeleteTownTarget(null)}
        onConfirm={handleDeleteTown}
        title="Delete Town"
        message={
          deleteTownTarget
            ? `Delete "${deleteTownTarget.name}" and all associated landmarks? This action will soft delete the town.`
            : ''
        }
        confirmText="Delete Town"
        cancelText="Cancel"
        variant="danger"
        dark
      />

      <ConfirmationModal
        isOpen={!!deleteLandmarkTarget}
        onClose={() => setDeleteLandmarkTarget(null)}
        onConfirm={handleDeleteLandmark}
        title="Delete Landmark"
        message={
          deleteLandmarkTarget
            ? `Delete landmark "${deleteLandmarkTarget.landmarkName}" from this town?`
            : ''
        }
        confirmText="Delete Landmark"
        cancelText="Cancel"
        variant="danger"
        dark
      />
    </div>
  );
};
