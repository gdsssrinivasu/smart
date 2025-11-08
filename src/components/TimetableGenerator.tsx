import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { TimetableDisplay } from "./TimetableDisplay";
import { ExportButtons } from "./ExportButtons";

interface Parameters {
  institution: string;
  course: string;
  classrooms: number;
  batches: number;
  subjects: number;
  maxClasses: number;
  frequency: number;
  faculty: number;
  leaveRequests: number;
  algorithm: string;
  startTime: string;
  endTime: string;
  workingDays: string[];
}

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

const AVAILABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TimetableGenerator() {
  const [parameters, setParameters] = useState<Parameters>({
    institution: '',
    course: '',
    classrooms: 5,
    batches: 3,
    subjects: 6,
    maxClasses: 6,
    frequency: 4, // Increased default frequency
    faculty: 8,
    leaveRequests: 0,
    algorithm: 'hybrid',
    startTime: '09:00',
    endTime: '17:00',
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [generatedTimetable, setGeneratedTimetable] = useState<TimetableData | null>(null);
  const [generationTime, setGenerationTime] = useState(0);
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCustomInstitution, setShowCustomInstitution] = useState(false);
  const [customInstitutionName, setCustomInstitutionName] = useState('');
  const [showCustomCourse, setShowCustomCourse] = useState(false);
  const [customCourseName, setCustomCourseName] = useState('');
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [customFaculty, setCustomFaculty] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newFaculty, setNewFaculty] = useState('');

  const institutions = useQuery(api.timetables.getInstitutions);
  const initializeInstitutions = useMutation(api.timetables.initializeInstitutions);
  const generateTimetable = useAction(api.timetableGenerator.generateTimetable);
  const saveTimetable = useMutation(api.timetables.saveTimetable);

  useEffect(() => {
    if (institutions && institutions.length === 0) {
      initializeInstitutions();
    }
  }, [institutions, initializeInstitutions]);

  const handleInstitutionChange = (institutionName: string) => {
    if (institutionName === 'others') {
      setShowCustomInstitution(true);
      setSelectedInstitution(null);
      setSelectedCourse(null);
      setShowCustomCourse(false);
      setParameters(prev => ({ ...prev, institution: '', course: '' }));
    } else {
      setShowCustomInstitution(false);
      setCustomInstitutionName('');
      const institution = institutions?.find(inst => inst.name === institutionName);
      setSelectedInstitution(institution);
      setSelectedCourse(null);
      setShowCustomCourse(false);
      setParameters(prev => ({ ...prev, institution: institutionName, course: '' }));
    }
  };

  const handleCourseChange = (courseId: string) => {
    if (courseId === 'others') {
      setShowCustomCourse(true);
      setSelectedCourse(null);
      setParameters(prev => ({ ...prev, course: '' }));
    } else {
      setShowCustomCourse(false);
      setCustomCourseName('');
      setCustomSubjects([]);
      setCustomFaculty([]);
      const course = selectedInstitution?.courses.find((c: any) => c.id === courseId);
      setSelectedCourse(course);
      setParameters(prev => ({ ...prev, course: courseId }));
    }
  };

  const handleWorkingDaysChange = (day: string, checked: boolean) => {
    setParameters(prev => ({
      ...prev,
      workingDays: checked 
        ? [...prev.workingDays, day]
        : prev.workingDays.filter(d => d !== day)
    }));
  };

  const handleTimetableUpdate = (updatedTimetable: TimetableData) => {
    setGeneratedTimetable(updatedTimetable);
    setHasUnsavedChanges(true);
  };

  const simulateProgress = () => {
    setProgress(0);
    setProgressMessage('Initializing optimized timetable generation...');
    
    const messages = [
      'Analyzing course requirements and slot availability...',
      'Creating balanced initial population with free periods...',
      'Evaluating fitness scores and optimal utilization...',
      'Resolving scheduling conflicts...',
      'Optimizing class distribution while preserving free periods...',
      'Applying balanced scheduling algorithms...',
      'Finalizing optimized timetable with guaranteed free periods...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < messages.length) {
        setProgress((currentStep / messages.length) * 90);
        setProgressMessage(messages[currentStep]);
      } else {
        clearInterval(interval);
        setProgress(100);
        setProgressMessage('Optimized timetable with guaranteed free periods generated!');
      }
    }, 1200);

    return interval;
  };

  const validateInputs = () => {
    if (showCustomInstitution && !customInstitutionName.trim()) {
      toast.error('Please enter institution name');
      return false;
    }
    if (showCustomCourse && !customCourseName.trim()) {
      toast.error('Please enter course name');
      return false;
    }
    if (showCustomCourse && customSubjects.length === 0) {
      toast.error('Please add at least one subject');
      return false;
    }
    if (showCustomCourse && customFaculty.length === 0) {
      toast.error('Please add at least one faculty member');
      return false;
    }
    if (!showCustomInstitution && !parameters.institution) {
      toast.error('Please select an institution');
      return false;
    }
    if (!showCustomCourse && !parameters.course) {
      toast.error('Please select a course');
      return false;
    }

    if (parameters.workingDays.length === 0) {
      toast.error('Please select at least one working day');
      return false;
    }

    if (parameters.startTime >= parameters.endTime) {
      toast.error('End time must be after start time');
      return false;
    }

    if (parameters.maxClasses > 12) {
      toast.error('Maximum 12 classes per day allowed');
      return false;
    }

    return true;
  };

  const calculateUtilizationStats = (timetable: TimetableData) => {
    let totalSlots = 0;
    let filledSlots = 0;
    let gapCount = 0;

    timetable.batches.forEach(batch => {
      Object.values(batch.schedule).forEach((day: any) => {
        const daySlots = Object.values(day);
        totalSlots += daySlots.length;
        
        daySlots.forEach((slot: any) => {
          if (slot) filledSlots++;
        });

        // Count gaps (empty slots between filled slots)
        const slotArray = Object.keys(day).map(timeSlot => day[timeSlot]);
        let foundFirst = false;
        let foundLast = false;
        
        for (let i = 0; i < slotArray.length; i++) {
          if (slotArray[i]) {
            foundFirst = true;
          } else if (foundFirst && !foundLast) {
            // Check if there are more classes after this
            for (let j = i + 1; j < slotArray.length; j++) {
              if (slotArray[j]) {
                gapCount++;
                break;
              }
            }
          }
        }
      });
    });

    return {
      utilization: totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0,
      filledSlots,
      totalSlots,
      gapCount
    };
  };

  const handleGenerate = async () => {
    if (!validateInputs()) return;

    setIsGenerating(true);
    setGeneratedTimetable(null);
    setHasUnsavedChanges(false);
    
    const progressInterval = simulateProgress();

    try {
      const institutionName = showCustomInstitution ? customInstitutionName : selectedInstitution.name;
      const courseName = showCustomCourse ? customCourseName : selectedCourse.name;
      const courseSubjects = showCustomCourse ? customSubjects : selectedCourse.subjects;
      const courseFaculty = showCustomCourse ? customFaculty : selectedCourse.faculty;

      const result = await generateTimetable({
        institutionName,
        courseName,
        courseData: {
          subjects: courseSubjects,
          faculty: courseFaculty,
        },
        parameters: {
          classrooms: parameters.classrooms,
          batches: parameters.batches,
          subjects: parameters.subjects,
          maxClasses: parameters.maxClasses,
          frequency: parameters.frequency,
          faculty: parameters.faculty,
          leaveRequests: parameters.leaveRequests,
          algorithm: parameters.algorithm,
          startTime: parameters.startTime,
          endTime: parameters.endTime,
          workingDays: parameters.workingDays,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage('Optimized timetable with guaranteed free periods generated!');
      
      const timetableWithDefaults: TimetableData = {
        ...result.timetable,
        fitness: result.timetable.fitness || 0,
        conflicts: result.timetable.conflicts || [],
        algorithm: result.timetable.algorithm || parameters.algorithm
      };
      
      setGeneratedTimetable(timetableWithDefaults);
      setGenerationTime(result.generationTime);
      
      const stats = calculateUtilizationStats(timetableWithDefaults);
      
      if (timetableWithDefaults.conflicts.length === 0) {
        toast.success(`Conflict-free timetable generated! ${stats.utilization.toFixed(1)}% utilization with guaranteed free periods.`);
      } else {
        toast.warning(`Timetable generated with ${timetableWithDefaults.conflicts.length} conflicts. ${stats.utilization.toFixed(1)}% utilization with free periods preserved.`);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Generation failed:', error);
      toast.error('Failed to generate timetable. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedTimetable) return;

    try {
      const institutionName = showCustomInstitution ? customInstitutionName : selectedInstitution.name;
      const courseName = showCustomCourse ? customCourseName : selectedCourse.name;

      await saveTimetable({
        institutionName,
        courseName,
        parameters: {
          classrooms: parameters.classrooms,
          batches: parameters.batches,
          subjects: parameters.subjects,
          maxClasses: parameters.maxClasses,
          frequency: parameters.frequency,
          faculty: parameters.faculty,
          leaveRequests: parameters.leaveRequests,
          algorithm: parameters.algorithm,
          startTime: parameters.startTime,
          endTime: parameters.endTime,
          workingDays: parameters.workingDays,
        },
        timetableData: generatedTimetable,
        generationTime,
      });
      
      setHasUnsavedChanges(false);
      toast.success('Optimized timetable saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save timetable');
    }
  };

  const handleNewTimetable = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to create a new timetable?');
      if (!confirmed) return;
    }
    
    setGeneratedTimetable(null);
    setProgress(0);
    setProgressMessage('');
    setHasUnsavedChanges(false);
  };

  if (!institutions) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const utilizationStats = generatedTimetable ? calculateUtilizationStats(generatedTimetable) : null;

  return (
    <div className="space-y-8">
      {!generatedTimetable ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Generate Optimized Timetable
              </h2>
              <p className="text-gray-600">Create an optimized schedule with balanced class distribution and guaranteed free periods</p>
            </div>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Institution *
                  </label>
                  <select
                    value={showCustomInstitution ? 'others' : parameters.institution}
                    onChange={(e) => handleInstitutionChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={!showCustomInstitution}
                  >
                    <option value="">Select Institution</option>
                    {institutions.map((inst) => (
                      <option key={inst._id} value={inst.name}>
                        {inst.name}
                      </option>
                    ))}
                    <option value="others">Others (Enter Manually)</option>
                  </select>
                  {showCustomInstitution && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={customInstitutionName}
                        onChange={(e) => setCustomInstitutionName(e.target.value)}
                        placeholder="Enter institution name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course *
                  </label>
                  <select
                    value={showCustomCourse ? 'others' : parameters.course}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!selectedInstitution && !showCustomInstitution}
                    required={!showCustomCourse}
                  >
                    <option value="">Select Course</option>
                    {selectedInstitution?.courses.map((course: any) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                    <option value="others">Others (Enter Manually)</option>
                  </select>
                  {showCustomCourse && (
                    <div className="mt-3 space-y-3">
                      <input
                        type="text"
                        value={customCourseName}
                        onChange={(e) => setCustomCourseName(e.target.value)}
                        placeholder="Enter course name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Subjects</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newSubject.trim()) {
                                  setCustomSubjects([...customSubjects, newSubject.trim()]);
                                  setNewSubject('');
                                }
                              }
                            }}
                            placeholder="Add subject and press Enter"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newSubject.trim()) {
                                setCustomSubjects([...customSubjects, newSubject.trim()]);
                                setNewSubject('');
                              }
                            }}
                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {customSubjects.map((subject, index) => (
                            <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {subject}
                              <button
                                type="button"
                                onClick={() => setCustomSubjects(customSubjects.filter((_, i) => i !== index))}
                                className="text-blue-700 hover:text-blue-900"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Faculty</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newFaculty}
                            onChange={(e) => setNewFaculty(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newFaculty.trim()) {
                                  setCustomFaculty([...customFaculty, newFaculty.trim()]);
                                  setNewFaculty('');
                                }
                              }
                            }}
                            placeholder="Add faculty and press Enter"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newFaculty.trim()) {
                                setCustomFaculty([...customFaculty, newFaculty.trim()]);
                                setNewFaculty('');
                              }
                            }}
                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {customFaculty.map((faculty, index) => (
                            <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              {faculty}
                              <button
                                type="button"
                                onClick={() => setCustomFaculty(customFaculty.filter((_, i) => i !== index))}
                                className="text-green-700 hover:text-green-900"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule Configuration */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Optimization Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Days *
                  </label>
                  <div className="space-y-2">
                    {AVAILABLE_DAYS.map(day => (
                      <label key={day} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={parameters.workingDays.includes(day)}
                          onChange={(e) => handleWorkingDaysChange(day, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={parameters.startTime}
                        onChange={(e) => setParameters(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={parameters.endTime}
                        onChange={(e) => setParameters(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Classes per Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={parameters.maxClasses}
                      onChange={(e) => setParameters(prev => ({ ...prev, maxClasses: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Parameters */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Classrooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={parameters.classrooms}
                    onChange={(e) => setParameters(prev => ({ ...prev, classrooms: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Batches
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={parameters.batches}
                    onChange={(e) => setParameters(prev => ({ ...prev, batches: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Subjects
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={parameters.subjects}
                    onChange={(e) => setParameters(prev => ({ ...prev, subjects: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weekly Frequency per Subject
                    <span className="text-xs text-blue-600 block">Higher values reduce free periods</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={parameters.frequency}
                    onChange={(e) => setParameters(prev => ({ ...prev, frequency: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Algorithm Type
                  </label>
                  <select
                    value={parameters.algorithm}
                    onChange={(e) => setParameters(prev => ({ ...prev, algorithm: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="hybrid">Hybrid (Best Optimization)</option>
                    <option value="genetic">Genetic Algorithm</option>
                    <option value="constraint">Constraint Programming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Faculty
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={parameters.faculty}
                    onChange={(e) => setParameters(prev => ({ ...prev, faculty: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 text-xl">💡</div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Optimization Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Guaranteed at least 1 free period per batch per week</li>
                    <li>• Use "Hybrid Algorithm" for optimal balance</li>
                    <li>• More working days = better distribution</li>
                    <li>• System automatically prevents over-scheduling</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isGenerating || !parameters.institution || !parameters.course}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Optimizing...
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    Generate Optimized Timetable
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isGenerating && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>⚡</span>
            Optimizing Timetable for Maximum Utilization...
          </h3>
          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <span className="animate-pulse">🔄</span>
              {progressMessage}
            </p>
          </div>
        </div>
      )}

      {generatedTimetable && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <span>✅</span>
                  Optimized Timetable Generated
                  {hasUnsavedChanges && (
                    <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                      Unsaved Changes
                    </span>
                  )}
                </h3>
                <p className="text-gray-600 mt-1">
                  {selectedInstitution?.name} - {selectedCourse?.name}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                    hasUnsavedChanges 
                      ? 'bg-orange-600 text-white hover:bg-orange-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {hasUnsavedChanges ? '💾 Save Changes' : '💾 Save Timetable'}
                </button>
                <button
                  onClick={handleNewTimetable}
                  className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  🔄 New Timetable
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${generatedTimetable.conflicts.length === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`text-2xl font-bold ${generatedTimetable.conflicts.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {generatedTimetable.conflicts.length}
                </div>
                <div className="text-sm text-gray-600">
                  {generatedTimetable.conflicts.length === 0 ? '✅ No Conflicts' : '⚠️ Conflicts'}
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {generatedTimetable.fitness.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Fitness Score</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {utilizationStats?.utilization.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Slot Utilization</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {utilizationStats?.gapCount || 0}
                </div>
                <div className="text-sm text-gray-600">Free Period Gaps</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {generationTime.toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600">Generation Time</div>
              </div>
            </div>

            {utilizationStats && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <span>📊</span>
                  Utilization Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Slots:</span>
                    <span className="font-medium ml-1">{utilizationStats.totalSlots}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Filled Slots:</span>
                    <span className="font-medium ml-1">{utilizationStats.filledSlots}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Free Periods:</span>
                    <span className="font-medium ml-1">{utilizationStats.totalSlots - utilizationStats.filledSlots}</span>
                  </div>
                </div>
              </div>
            )}

            {generatedTimetable.conflicts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  Scheduling Conflicts Detected
                </h4>
                <div className="space-y-2">
                  {generatedTimetable.conflicts.slice(0, 5).map((conflict, index) => (
                    <div key={index} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <div>
                        <strong>{conflict.description}</strong>
                        <br />
                        <span className="text-red-600">{conflict.details}</span>
                      </div>
                    </div>
                  ))}
                  {generatedTimetable.conflicts.length > 5 && (
                    <div className="text-sm text-red-600 font-medium">
                      ... and {generatedTimetable.conflicts.length - 5} more conflicts
                    </div>
                  )}
                </div>
                <div className="mt-3 text-sm text-red-700">
                  <strong>Suggestion:</strong> Try increasing weekly frequency or adjusting the number of batches to reduce conflicts.
                </div>
              </div>
            )}

            <ExportButtons 
              timetable={generatedTimetable} 
              workingDays={parameters.workingDays}
              startTime={parameters.startTime}
              endTime={parameters.endTime}
              maxClasses={parameters.maxClasses}
            />
          </div>

          <TimetableDisplay 
            timetable={generatedTimetable} 
            workingDays={parameters.workingDays}
            startTime={parameters.startTime}
            endTime={parameters.endTime}
            maxClasses={parameters.maxClasses}
            onTimetableUpdate={handleTimetableUpdate}
          />
        </div>
      )}
    </div>
  );
}
