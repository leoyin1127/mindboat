import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Calendar, Clock, TrendingUp, ArrowLeft, Target, Compass, Star, Award } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useVoyageStore } from '../../stores/voyageStore';
import { useUserStore } from '../../stores/userStore';
import { useDestinationStore } from '../../stores/destinationStore';
import type { Voyage } from '../../types';

interface GrandMapProps {
  onBack: () => void;
}

export const GrandMap: React.FC<GrandMapProps> = ({ onBack }) => {
  const { voyageHistory, loadVoyageHistory } = useVoyageStore();
  const { user, lighthouseGoal } = useUserStore();
  const { destinations } = useDestinationStore();
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'destinations' | 'progress'>('overview');

  useEffect(() => {
    if (user) {
      loadVoyageHistory(user.id);
    }
  }, [user, loadVoyageHistory]);

  const totalFocusTime = voyageHistory.reduce((total, voyage) => 
    total + (voyage.actual_duration || 0), 0
  );

  const totalVoyages = voyageHistory.length;
  const averageFocusTime = totalVoyages > 0 ? Math.round(totalFocusTime / totalVoyages) : 0;
  const totalDestinations = destinations.length;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getDestinationStats = () => {
    const stats = destinations.map(dest => {
      const voyagesForDest = voyageHistory.filter(v => v.destination_id === dest.id);
      const totalTime = voyagesForDest.reduce((sum, v) => sum + (v.actual_duration || 0), 0);
      return {
        destination: dest,
        voyageCount: voyagesForDest.length,
        totalTime,
        lastVisited: voyagesForDest.length > 0 ? 
          Math.max(...voyagesForDest.map(v => new Date(v.created_at).getTime())) : null
      };
    });
    return stats.sort((a, b) => b.totalTime - a.totalTime);
  };

  const generateMapPath = () => {
    if (voyageHistory.length === 0) return '';
    
    const points = voyageHistory.map((_, index) => {
      const x = 10 + (index * 80) / Math.max(voyageHistory.length - 1, 1);
      const y = 30 + Math.sin(index * 0.5) * 20 + (Math.random() - 0.5) * 10;
      return { x, y };
    });

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) * 0.3;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * 0.3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  const getMotivationalMessage = () => {
    if (totalVoyages === 0) {
      return "Your journey begins with a single voyage. Every lighthouse was once just a dream.";
    } else if (totalVoyages < 5) {
      return "You're building momentum! Each voyage strengthens your focus like waves shape the shore.";
    } else if (totalVoyages < 20) {
      return "Your dedication is showing! You're becoming the captain of your own attention.";
    } else {
      return "You're a seasoned navigator of focus! Your lighthouse shines brighter with each voyage.";
    }
  };

  const getAchievements = () => {
    const achievements = [];
    
    if (totalVoyages >= 1) achievements.push({ icon: '🚢', title: 'First Voyage', desc: 'Completed your first focused session' });
    if (totalVoyages >= 10) achievements.push({ icon: '⚓', title: 'Steady Sailor', desc: 'Completed 10 voyages' });
    if (totalFocusTime >= 60) achievements.push({ icon: '⏰', title: 'Hour of Focus', desc: 'Accumulated 1 hour of focus time' });
    if (totalDestinations >= 3) achievements.push({ icon: '🗺️', title: 'Explorer', desc: 'Created 3 destinations' });
    if (totalFocusTime >= 300) achievements.push({ icon: '🏆', title: 'Focus Master', desc: 'Accumulated 5 hours of focus time' });
    
    return achievements;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
              <Map className="w-10 h-10 mr-3" />
              Grand Voyage Map
            </h1>
            <p className="text-xl text-blue-200">Your focused growth journey</p>
          </div>
          <Button
            onClick={onBack}
            variant="outline"
            icon={ArrowLeft}
            className="text-white border-white hover:bg-white/10"
          >
            Back to Sailing
          </Button>
        </motion.div>

        {/* Lighthouse Goal Display */}
        {lighthouseGoal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-900" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Your Lighthouse Goal</h3>
                  <p className="text-gray-700">{lighthouseGoal}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'destinations', label: 'Destinations', icon: Compass },
              { id: 'progress', label: 'Progress', icon: Target }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
                  activeTab === id 
                    ? 'bg-white text-gray-800 shadow-lg' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{totalVoyages}</p>
                  <p className="text-sm text-gray-600">Total Voyages</p>
                </Card>
                
                <Card className="p-6 text-center">
                  <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{formatDuration(totalFocusTime)}</p>
                  <p className="text-sm text-gray-600">Total Focus Time</p>
                </Card>
                
                <Card className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{formatDuration(averageFocusTime)}</p>
                  <p className="text-sm text-gray-600">Average Duration</p>
                </Card>

                <Card className="p-6 text-center">
                  <Compass className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{totalDestinations}</p>
                  <p className="text-sm text-gray-600">Destinations</p>
                </Card>
              </div>

              {/* Motivational Message */}
              <Card className="p-6 text-center bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Captain's Log</h3>
                <p className="text-lg text-gray-700 italic">"{getMotivationalMessage()}"</p>
              </Card>

              {/* Achievements */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Award className="w-6 h-6 mr-2" />
                  Achievements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getAchievements().map((achievement, index) => (
                    <motion.div
                      key={achievement.title}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div>
                        <p className="font-medium text-gray-800">{achievement.title}</p>
                        <p className="text-sm text-gray-600">{achievement.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                  {getAchievements().length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <Award className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Complete your first voyage to earn achievements!</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'destinations' && (
            <motion.div
              key="destinations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-6">Destination Statistics</h3>
                
                {destinations.length === 0 ? (
                  <div className="text-center py-12">
                    <Compass className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No destinations created yet</p>
                    <p className="text-gray-400">Create your first destination to start sailing!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getDestinationStats().map((stat, index) => (
                      <motion.div
                        key={stat.destination.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-4 h-12 rounded-full"
                            style={{ backgroundColor: stat.destination.color_theme }}
                          />
                          <div>
                            <h4 className="font-semibold text-gray-800">
                              {stat.destination.destination_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {stat.destination.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-800">
                            {stat.voyageCount} voyage{stat.voyageCount !== 1 ? 's' : ''}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDuration(stat.totalTime)} total
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {activeTab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-6">Voyage Trail</h3>
                
                {voyageHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No completed voyages yet</p>
                    <p className="text-gray-400 mb-6">Your voyage trail will appear here after completing focused sessions</p>
                    
                    {/* Sample Trail Preview */}
                    <div className="max-w-md mx-auto">
                      <p className="text-sm text-gray-500 mb-4">Here's what your trail will look like:</p>
                      <svg 
                        viewBox="0 0 100 40" 
                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg"
                        style={{ background: 'linear-gradient(to bottom, #e0f2fe 0%, #b3e5fc 100%)' }}
                      >
                        <defs>
                          <pattern id="sample-waves" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
                            <path d="M0,5 Q5,0 10,5 T20,5" stroke="#81d4fa" strokeWidth="0.5" fill="none" opacity="0.3"/>
                          </pattern>
                        </defs>
                        <rect width="100" height="40" fill="url(#sample-waves)" />
                        
                        {/* Sample path */}
                        <path
                          d="M10,20 Q30,15 50,20 T90,20"
                          stroke="#1976d2"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray="5,5"
                          opacity="0.5"
                        />
                        
                        {/* Sample points */}
                        {[10, 30, 50, 70, 90].map((x, i) => (
                          <circle
                            key={i}
                            cx={x}
                            cy={20 + Math.sin(i) * 3}
                            r="2"
                            fill="#3B82F6"
                            opacity="0.5"
                          />
                        ))}
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <svg 
                      viewBox="0 0 100 80" 
                      className="w-full h-64 md:h-80"
                      style={{ background: 'linear-gradient(to bottom, #e0f2fe 0%, #b3e5fc 100%)' }}
                    >
                      {/* Ocean waves background */}
                      <defs>
                        <pattern id="waves" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
                          <path d="M0,5 Q5,0 10,5 T20,5" stroke="#81d4fa" strokeWidth="0.5" fill="none" opacity="0.3"/>
                        </pattern>
                      </defs>
                      <rect width="100" height="80" fill="url(#waves)" />
                      
                      {/* Voyage path */}
                      <path
                        d={generateMapPath()}
                        stroke="#1976d2"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray="5,5"
                      />
                      
                      {/* Voyage points */}
                      {voyageHistory.map((voyage, index) => {
                        const x = 10 + (index * 80) / Math.max(voyageHistory.length - 1, 1);
                        const y = 30 + Math.sin(index * 0.5) * 20 + (Math.random() - 0.5) * 10;
                        
                        return (
                          <g key={voyage.id}>
                            <circle
                              cx={x}
                              cy={y}
                              r="3"
                              fill={voyage.destination?.color_theme || '#3B82F6'}
                              stroke="white"
                              strokeWidth="2"
                              className="cursor-pointer hover:r-4 transition-all"
                              onClick={() => setSelectedVoyage(voyage)}
                            />
                            {selectedVoyage?.id === voyage.id && (
                              <circle
                                cx={x}
                                cy={y}
                                r="6"
                                fill="none"
                                stroke={voyage.destination?.color_theme || '#3B82F6'}
                                strokeWidth="2"
                                opacity="0.5"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                    
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      Click on points in the map to view voyage details
                    </p>
                  </div>
                )}
              </Card>

              {/* Voyage Details */}
              {selectedVoyage && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Voyage Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Destination</h4>
                        <p className="text-lg font-semibold" style={{ color: selectedVoyage.destination?.color_theme }}>
                          {selectedVoyage.destination?.destination_name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedVoyage.destination?.description}
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium">{formatDuration(selectedVoyage.actual_duration || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Distractions:</span>
                          <span className="font-medium">{selectedVoyage.distraction_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">
                            {new Date(selectedVoyage.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};