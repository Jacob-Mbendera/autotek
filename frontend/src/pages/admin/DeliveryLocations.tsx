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
} from 'lucide-react';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';

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
  const [editingTown, setEditingTown] = useState<string | null>(null);
  const [editTownName, setEditTownName] = useState('');
  const [editingLandmark, setEditingLandmark] = useState<{ townId: string; landmarkId: string } | null>(null);
  const [editLandmarkName, setEditLandmarkName] = useState('');
  const [newLandmarkName, setNewLandmarkName] = useState('');
  const [addingLandmarkTo, setAddingLandmarkTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

    try {
      await createTown({ town: newTownName.trim(), landmarks: validLandmarks }).unwrap();
      dispatch(showNotification({ message: 'Town created successfully', type: 'success' }));
      setShowAddTownModal(false);
      setNewTownName('');
      setNewTownLandmarks(['']);
    } catch (error: any) {
      dispatch(showNotification({ message: error.data?.message || 'Failed to create town', type: 'error' }));
    }
  };

  // Handle update town name
  const handleUpdateTown = async (townId: string) => {
    if (!editTownName.trim()) {
      dispatch(showNotification({ message: 'Town name cannot be empty', type: 'error' }));
      return;
    }

    try {
      await updateTown({ id: townId, data: { town: editTownName.trim() } }).unwrap();
      dispatch(showNotification({ message: 'Town updated successfully', type: 'success' }));
      setEditingTown(null);
      setEditTownName('');
    } catch (error: any) {
      dispatch(showNotification({ message: error.data?.message || 'Failed to update town', type: 'error' }));
    }
  };

  // Handle delete town
  const handleDeleteTown = async (townId: string, townName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${townName}"? This will soft delete the town.`)) {
      return;
    }

    try {
      await deleteTown(townId).unwrap();
      dispatch(showNotification({ message: 'Town deleted successfully', type: 'success' }));
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
  const handleDeleteLandmark = async (townId: string, landmarkId: string, landmarkName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${landmarkName}"?`)) {
      return;
    }

    try {
      await deleteLandmark({ townId, landmarkId }).unwrap();
      dispatch(showNotification({ message: 'Landmark deleted successfully', type: 'success' }));
    } catch (error: any) {
      dispatch(showNotification({ message: error.data?.message || 'Failed to delete landmark', type: 'error' }));
    }
  };

  // Filter towns by search query
  const filteredLocations = data?.deliveryLocations.filter((location) =>
    location.town.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load delivery locations</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <H1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Locations</H1>
        <Body className="text-gray-600">
          Manage towns and landmarks for Malawi delivery addresses
        </Body>
      </div>

      {/* Search and Add */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search towns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAddTownModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Town
        </Button>
      </div>

      {/* Towns List */}
      <div className="space-y-4">
        {filteredLocations?.map((location) => (
          <Card key={location._id} className="p-6">
            {/* Town Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-teal-600" />
                {editingTown === location._id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editTownName}
                      onChange={(e) => setEditTownName(e.target.value)}
                      className="w-64"
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
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <H2 className="text-2xl font-bold text-gray-900">{location.town}</H2>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{location.landmarks.length} landmarks</span>
                {!editingTown && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingTown(location._id);
                        setEditTownName(location.town);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteTown(location._id, location.town)}
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
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  {editingLandmark?.landmarkId === landmark._id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
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
                        <span className={landmark.active ? 'text-gray-900' : 'text-gray-400'}>
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
                          onClick={() => handleDeleteLandmark(location._id, landmark._id, landmark.name)}
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
                <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg">
                  <Input
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
          </Card>
        ))}
      </div>

      {/* Add Town Modal */}
      {showAddTownModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <H2 className="text-2xl font-bold">Add New Town</H2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowAddTownModal(false);
                  setNewTownName('');
                  setNewTownLandmarks(['']);
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
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddTown}>Create Town</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
