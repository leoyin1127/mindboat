import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor, Play, Camera, Mic, Monitor, CheckCircle, AlertCircle, Plus, ArrowLeft, Map } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { useDestinationStore } from '../../stores/destinationStore';
import { useDistraction } from '../../hooks/useDistraction';
import { useUserStore } from '../../stores/userStore';
import { ScreenshotService } from '../../services/ScreenshotService';
import type { Destination } from '../../types';

interface VoyagePreparationProps {
  onStartVoyage: (destination: Destination, plannedDuration: number) => void;
  onViewMap?: () => void;
  onManageDestinations?: () => void;
}

export const VoyagePreparation: React.FC<VoyagePreparationProps> = ({ 
  onStartVoyage, 
  onViewMap,
  onManageDestinations 
}) => {
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [plannedDuration, setPlannedDuration] = useState(25); // Default 25 minutes
  const [permissionsStep, setPermissionsStep] = useState(false);
  const [showAddDestination, setShowAddDestination] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  
  const { destinations, createDestination, isLoading } = useDestinationStore();
  const { user } = useUserStore();
  const { requestPermissions, permissionsGranted } = useDistraction();

  const handleDestinationSelect = (destination: Destination) => {
    setSelectedDestination(destination);
    setPermissionsStep(true);
  };

  const handleRequestPermissions = async () => {
    setIsRequestingPermissions(true);
    
    try {
      // Request camera and microphone permissions
      await requestPermissions();
      
      // Also request screen sharing permission for advanced monitoring
      const screenPermissionGranted = await ScreenshotService.requestScreenPermission();
      
      if (screenPermissionGranted) {
        console.log('Screen sharing permission granted for advanced monitoring');
      } else {
        console.warn('Screen sharing permission denied - will use basic monitoring only');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  const handleStartSailing = () => {
    if (!selectedDestination) return;
    
    // Call the parent's onStartVoyage function
    onStartVoyage(selectedDestination, plannedDuration);
  };

  const handleCreateDestination = async () => {
    if (!newTask.trim() || !user) return;
    
    setIsCreating(true);
    const newDestination = await createDestination(newTask, user.id);
    if (newDestination) {
      setNewTask('');
      setShowAddDestination(false);
    }
    setIsCreating(false);
  };

  const handleBackToDestinations = () => {
    setSelectedDestination(null);
    setPermissionsStep(false);
  };

  const encouragementMessages = [
    "May the wind guide your way and the sea open your path",
    "Every moment of focus brings you closer to your ideal self",
    "Find inner peace in the ocean of concentration",
    "Let thoughts be your sail and focus your rudder toward your goal",
  ];

  const randomEncouragement = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];

  if (permissionsStep && selectedDestination) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-4">
        <div className="max-w-2xl mx-auto py-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button
              onClick={handleBackToDestinations}
              variant="ghost"
              icon={ArrowLeft}
              className="text-white hover:bg-white/10"
            >
              Back to Destinations
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 mx-auto mb-4">
              <Anchor className="w-20 h-20 text-blue-300" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Prepare to Sail</h1>
            <p className="text-blue-200">Destination: {selectedDestination.destination_name}</p>
          </motion.div>

          <Card className="p-8 mb-6">
            <h2 className="text-2xl font-semibold mb-6 text-center">Voyage Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Planned Duration (minutes)
                </label>
                <input
                  type="number"
                  value={plannedDuration}
                  onChange={(e) => setPlannedDuration(Number(e.target.value))}
                  min="5"
                  max="180"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Sensor Permissions</h3>
                <p className="text-sm text-gray-600 mb-4">
                  To better detect distraction, we can use the following permissions:
                </p>
                
                <div className="space-y-3">
                  <PermissionItem
                    icon={Camera}
                    title="Camera"
                    description="Detect when your gaze leaves the screen"
                    granted={permissionsGranted.camera}
                  />
                  <PermissionItem
                    icon={Mic}
                    title="Microphone"
                    description="Detect environmental sound changes"
                    granted={permissionsGranted.microphone}
                  />
                  <PermissionItem
                    icon={Monitor}
                    title="Tab Switching"
                    description="Detect when switching to other apps"
                    granted={true} // Always available
                  />
                  <PermissionItem
                    icon={Monitor}
                    title="Screen Sharing"
                    description="Advanced content analysis for better distraction detection"
                    granted={ScreenshotService.isPermissionGranted()}
                  />
                </div>

                {(!permissionsGranted.camera || !permissionsGranted.microphone || !ScreenshotService.isPermissionGranted()) && (
                  <Button
                    onClick={handleRequestPermissions}
                    loading={isRequestingPermissions}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    {isRequestingPermissions ? 'Requesting Permissions...' : 'Request Advanced Permissions (Optional)'}
                  </Button>
                )}
                
                <p className="text-xs text-gray-500 mt-2">
                  All permissions are optional. Basic distraction detection works without them.
                  Screen sharing enables advanced content analysis for better distraction detection.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-800 mb-2">Daily Inspiration</p>
              <p className="text-gray-600 italic">"{randomEncouragement}"</p>
            </div>
          </Card>

          <div className="text-center">
            <Button
              onClick={handleStartSailing}
              loading={isLoading}
              size="lg"
              icon={Play}
              className="px-8 py-4 text-xl"
            >
              Start Sailing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header with Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Choose Your Sailing Destination
            </h1>
            <p className="text-xl text-purple-200">
              Every moment of focus brings you closer to your ideal self
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {onViewMap && (
              <Button
                onClick={onViewMap}
                variant="outline"
                icon={Map}
                className="text-white border-white hover:bg-white/10"
              >
                View Map
              </Button>
            )}
          </div>
        </motion.div>

        {/* Add New Destination Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Button
            onClick={() => setShowAddDestination(!showAddDestination)}
            variant="outline"
            icon={Plus}
            className="text-white border-white hover:bg-white/10"
          >
            Add New Destination
          </Button>
        </motion.div>

        {/* Add Destination Form */}
        <AnimatePresence>
          {showAddDestination && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Create New Destination</h3>
                <div className="flex gap-4">
                  <Input
                    placeholder="e.g., Complete thesis, Learn piano, Build app..."
                    value={newTask}
                    onChange={setNewTask}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreateDestination}
                    disabled={!newTask.trim()}
                    loading={isCreating}
                    icon={Plus}
                  >
                    Create
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddDestination(false);
                      setNewTask('');
                    }}
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {destinations.map((destination, index) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                index={index}
                onSelect={handleDestinationSelect}
              />
            ))}
          </AnimatePresence>
        </div>

        {destinations.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Anchor className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white text-xl mb-2">No destinations yet</p>
            <p className="text-purple-200">Create your first destination to start sailing!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

interface PermissionItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  granted: boolean;
}

const PermissionItem: React.FC<PermissionItemProps> = ({ icon: Icon, title, description, granted }) => (
  <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
    <Icon className="w-5 h-5 text-gray-600" />
    <div className="flex-1">
      <p className="font-medium text-gray-800">{title}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
    {granted ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <AlertCircle className="w-5 h-5 text-yellow-500" />
    )}
  </div>
);

interface DestinationCardProps {
  destination: Destination;
  index: number;
  onSelect: (destination: Destination) => void;
}

const DestinationCard: React.FC<DestinationCardProps> = ({ destination, index, onSelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card 
        className="cursor-pointer transform transition-all duration-200 hover:scale-105"
        onClick={() => onSelect(destination)}
      >
        <div 
          className="h-3 w-full"
          style={{ backgroundColor: destination.color_theme }}
        />
        
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {destination.destination_name}
          </h3>
          
          <p className="text-gray-600 mb-4 text-sm">
            {destination.description}
          </p>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Related Apps:</p>
            <div className="flex flex-wrap gap-2">
              {destination.related_apps.slice(0, 3).map((app, appIndex) => (
                <span
                  key={appIndex}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {app}
                </span>
              ))}
              {destination.related_apps.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{destination.related_apps.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};