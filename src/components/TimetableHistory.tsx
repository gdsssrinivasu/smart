import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { TimetableDisplay } from "./TimetableDisplay";
import { ExportButtons } from "./ExportButtons";
import { useState } from "react";

export function TimetableHistory() {
  const [selectedTimetable, setSelectedTimetable] = useState<any>(null);
  
  const timetables = useQuery(api.timetables.getUserTimetables);
  const deleteTimetable = useMutation(api.timetables.deleteTimetable);

  const handleDelete = async (timetableId: string) => {
    if (!confirm('Are you sure you want to delete this timetable?')) return;
    
    try {
      await deleteTimetable({ timetableId: timetableId as any });
      toast.success('Timetable deleted successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete timetable');
    }
  };

  const handleView = (timetable: any) => {
    setSelectedTimetable(timetable);
  };

  const handleBack = () => {
    setSelectedTimetable(null);
  };

  if (timetables === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedTimetable) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <span>←</span>
            Back to History
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <span>📅</span>
              {selectedTimetable.institutionName} - {selectedTimetable.courseName}
            </h2>
            <p className="text-gray-600">
              Generated on {new Date(selectedTimetable.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${selectedTimetable.timetableData.conflicts.length === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`text-2xl font-bold ${selectedTimetable.timetableData.conflicts.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {selectedTimetable.timetableData.conflicts.length}
              </div>
              <div className="text-sm text-gray-600">
                {selectedTimetable.timetableData.conflicts.length === 0 ? '✅ No Conflicts' : '⚠️ Conflicts'}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {selectedTimetable.timetableData.fitness.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Fitness Score</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {selectedTimetable.generationTime.toFixed(1)}s
              </div>
              <div className="text-sm text-gray-600">Generation Time</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 capitalize">
                {selectedTimetable.timetableData.algorithm}
              </div>
              <div className="text-sm text-gray-600">Algorithm Used</div>
            </div>
          </div>

          <ExportButtons timetable={selectedTimetable.timetableData} />
        </div>

        <TimetableDisplay 
          timetable={selectedTimetable.timetableData}
          workingDays={selectedTimetable.parameters.workingDays}
          startTime={selectedTimetable.parameters.startTime}
          endTime={selectedTimetable.parameters.endTime}
          maxClasses={selectedTimetable.parameters.maxClasses}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2 rounded-lg">
          <span className="text-2xl">📚</span>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Timetable History
          </h2>
          <p className="text-gray-600">
            View and manage your previously generated timetables
          </p>
        </div>
      </div>

      {timetables.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Timetables Yet
          </h3>
          <p className="text-gray-600">
            Generate your first timetable to see it here
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {timetables.map((timetable) => (
            <div key={timetable._id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {timetable.institutionName} - {timetable.courseName}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-600">Batches:</span>
                      <span className="font-medium ml-1">{timetable.parameters.batches}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Subjects:</span>
                      <span className="font-medium ml-1">{timetable.parameters.subjects}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Algorithm:</span>
                      <span className="font-medium ml-1 capitalize">{timetable.parameters.algorithm}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Fitness:</span>
                      <span className="font-medium ml-1">{timetable.timetableData.fitness.toFixed(1)}%</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Working Days:</span>
                      <span className="font-medium ml-1">{timetable.parameters.workingDays?.length || 5}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <span>📅</span>
                      Generated: {new Date(timetable.createdAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {timetable.timetableData.conflicts.length === 0 ? (
                        <>
                          <span>✅</span>
                          <span className="text-green-600 font-medium">Conflict-free</span>
                        </>
                      ) : (
                        <>
                          <span>⚠️</span>
                          <span className="text-red-600 font-medium">
                            {timetable.timetableData.conflicts.length} conflicts
                          </span>
                        </>
                      )}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span>⏰</span>
                      {timetable.parameters.startTime} - {timetable.parameters.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleView(timetable)}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <span>👁️</span>
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(timetable._id)}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                  >
                    <span>🗑️</span>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
