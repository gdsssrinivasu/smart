import { useState } from "react";
import { toast } from "sonner";

interface TimetableData {
  batches: Array<{
    id: number;
    name: string;
    schedule: Record<string, Record<string, any>>;
  }>;
  fitness: number;
  conflicts: any[];
  algorithm: string;
}

interface Props {
  timetable: TimetableData;
  workingDays?: string[];
  startTime?: string;
  endTime?: string;
  maxClasses?: number;
  onTimetableUpdate?: (updatedTimetable: TimetableData) => void;
}

interface EditingCell {
  batchId: number;
  day: string;
  slot: string;
  field: 'faculty' | 'subject' | 'timeSlot';
}

export function TimetableDisplay({ 
  timetable, 
  workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  startTime = "09:00",
  endTime = "17:00",
  maxClasses = 6,
  onTimetableUpdate
}: Props) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [localTimetable, setLocalTimetable] = useState<TimetableData>(timetable);
  const [isEditMode, setIsEditMode] = useState(false);

  // Generate time slots based on parameters
  const generateTimeSlots = () => {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes && slots.length < maxClasses; minutes += 60) {
      const currentHour = Math.floor(minutes / 60);
      const currentMinute = minutes % 60;
      const nextHour = Math.floor((minutes + 60) / 60);
      const nextMinute = (minutes + 60) % 60;
      
      const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}-${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
      slots.push(timeSlot);
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const startEdit = (batchId: number, day: string, slot: string, field: 'faculty' | 'subject' | 'timeSlot', currentValue: string) => {
    if (!isEditMode) return;
    
    setEditingCell({ batchId, day, slot, field });
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const saveEdit = () => {
    if (!editingCell || !editValue.trim()) {
      toast.error("Please enter a valid value");
      return;
    }

    const updatedTimetable = { ...localTimetable };
    const batch = updatedTimetable.batches.find(b => b.id === editingCell.batchId);
    
    if (!batch) return;

    if (editingCell.field === 'faculty') {
      // Update faculty name
      const classInfo = batch.schedule[editingCell.day][editingCell.slot];
      if (classInfo) {
        batch.schedule[editingCell.day][editingCell.slot] = {
          ...classInfo,
          faculty: editValue.trim()
        };
        toast.success("Faculty updated successfully");
      }
    } else if (editingCell.field === 'subject') {
      // Update subject name
      const classInfo = batch.schedule[editingCell.day][editingCell.slot];
      if (classInfo) {
        batch.schedule[editingCell.day][editingCell.slot] = {
          ...classInfo,
          subject: editValue.trim()
        };
        toast.success("Subject updated successfully");
      }
    } else if (editingCell.field === 'timeSlot') {
      // Update time slot (this would require more complex logic to maintain schedule integrity)
      // For now, we'll show a message that this feature is coming soon
      toast.info("Time slot editing will be available in a future update");
      cancelEdit();
      return;
    }

    setLocalTimetable(updatedTimetable);
    onTimetableUpdate?.(updatedTimetable);
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (editingCell) {
      cancelEdit();
    }
    toast.info(isEditMode ? "Edit mode disabled" : "Edit mode enabled - Click on subjects or faculty names to edit");
  };

  const resetChanges = () => {
    setLocalTimetable(timetable);
    setEditingCell(null);
    toast.success("Changes reset to original timetable");
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header with Edit Controls */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <span>📋</span>
              Generated Timetable
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {isEditMode ? "Click on subjects or faculty names to edit them" : "View-only mode"}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleEditMode}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isEditMode 
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              <span>{isEditMode ? '🔒' : '✏️'}</span>
              {isEditMode ? 'Exit Edit Mode' : 'Enable Editing'}
            </button>
            
            {isEditMode && (
              <button
                onClick={resetChanges}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <span>↺</span>
                Reset Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto">
        {localTimetable.batches.map((batch) => (
          <div key={batch.id} className="border-b border-gray-100 last:border-b-0">
            {/* Batch Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {batch.name}
                </span>
              </h4>
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r border-gray-200 min-w-[120px]">
                      Time Slot
                    </th>
                    {workingDays.map((day) => (
                      <th key={day} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0 min-w-[160px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot, timeIndex) => (
                    <tr key={timeSlot} className={timeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-700 border-r border-gray-200 bg-gray-50">
                        <div className="flex flex-col">
                          <span className="font-semibold">{timeSlot}</span>
                          <span className="text-xs text-gray-500">Period {timeIndex + 1}</span>
                        </div>
                      </td>
                      {workingDays.map((day) => {
                        const classInfo = batch.schedule[day]?.[timeSlot];
                        const hasConflict = localTimetable.conflicts?.some(conflict => 
                          conflict.day === day && 
                          conflict.slot === timeSlot && 
                          conflict.batches?.includes(batch.id)
                        );

                        return (
                          <td key={day} className={`px-4 py-4 border-r border-gray-200 last:border-r-0 ${hasConflict ? 'bg-red-50' : ''}`}>
                            {classInfo ? (
                              <div className="space-y-2">
                                {/* Subject - Editable */}
                                {editingCell?.batchId === batch.id && 
                                 editingCell?.day === day && 
                                 editingCell?.slot === timeSlot && 
                                 editingCell?.field === 'subject' ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={handleKeyPress}
                                      className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-semibold"
                                      placeholder="Subject name"
                                      autoFocus
                                    />
                                    <div className="flex gap-1 justify-center">
                                      <button
                                        onClick={saveEdit}
                                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                        title="Save (Enter)"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                                        title="Cancel (Esc)"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold text-white text-center transition-all duration-200 ${
                                      isEditMode ? 'hover:ring-2 hover:ring-white hover:ring-opacity-50 cursor-pointer transform hover:scale-105' : ''
                                    }`}
                                    style={{ backgroundColor: classInfo.color || '#3B82F6' }}
                                    onClick={() => startEdit(batch.id, day, timeSlot, 'subject', classInfo.subject)}
                                    title={isEditMode ? "Click to edit subject" : ""}
                                  >
                                    {classInfo.subject}
                                    {isEditMode && <span className="ml-1 text-white opacity-75">✏️</span>}
                                  </div>
                                )}
                                
                                {/* Faculty - Editable */}
                                <div className="text-center">
                                  {editingCell?.batchId === batch.id && 
                                   editingCell?.day === day && 
                                   editingCell?.slot === timeSlot && 
                                   editingCell?.field === 'faculty' ? (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Faculty name"
                                        autoFocus
                                      />
                                      <div className="flex gap-1 justify-center">
                                        <button
                                          onClick={saveEdit}
                                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                          title="Save (Enter)"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                                          title="Cancel (Esc)"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div 
                                      className={`text-xs text-gray-600 px-2 py-1 rounded transition-all duration-200 ${
                                        isEditMode ? 'hover:bg-blue-100 cursor-pointer border border-transparent hover:border-blue-300' : ''
                                      }`}
                                      onClick={() => startEdit(batch.id, day, timeSlot, 'faculty', classInfo.faculty)}
                                      title={isEditMode ? "Click to edit faculty" : ""}
                                    >
                                      👨‍🏫 {classInfo.faculty}
                                      {isEditMode && <span className="ml-1 text-blue-500">✏️</span>}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Room */}
                                <div className="text-xs text-gray-500 text-center">
                                  🏫 {classInfo.room}
                                </div>
                                
                                {/* Conflict Indicator */}
                                {hasConflict && (
                                  <div className="text-xs text-red-600 text-center font-medium">
                                    ⚠️ Conflict
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <div className="text-sm text-gray-400 font-medium">Free Period</div>
                                <div className="text-xs text-gray-300 mt-1">No class scheduled</div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Mode Instructions */}
      {isEditMode && (
        <div className="bg-blue-50 border-t border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-lg">💡</div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Edit Mode Instructions</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click on any subject or faculty name to edit it</li>
                <li>• Press <kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Enter</kbd> to save or <kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Esc</kbd> to cancel</li>
                <li>• Use "Reset Changes" to revert to the original timetable</li>
                <li>• Changes are automatically saved to your local view</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-gray-50 border-t p-4">
        <h4 className="font-medium text-gray-800 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Regular Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>Conflict Detected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Free Period</span>
          </div>
          {isEditMode && (
            <div className="flex items-center gap-2">
              <span className="text-blue-500">✏️</span>
              <span>Editable Field</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
