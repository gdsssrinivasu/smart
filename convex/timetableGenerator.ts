import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateTimetable = action({
  args: {
    institutionName: v.string(),
    courseName: v.string(),
    courseData: v.object({
      subjects: v.array(v.string()),
      faculty: v.array(v.string()),
    }),
    parameters: v.object({
      classrooms: v.number(),
      batches: v.number(),
      subjects: v.number(),
      maxClasses: v.number(),
      frequency: v.number(),
      faculty: v.number(),
      leaveRequests: v.number(),
      algorithm: v.string(),
      startTime: v.string(),
      endTime: v.string(),
      workingDays: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    const generator = new TimetableGenerator(args.courseData, args.parameters);
    
    let timetable;
    if (args.parameters.algorithm === 'genetic') {
      timetable = await generator.geneticAlgorithm();
    } else if (args.parameters.algorithm === 'constraint') {
      timetable = await generator.constraintProgramming();
    } else {
      timetable = await generator.hybridAlgorithm();
    }
    
    const endTime = Date.now();
    const generationTime = (endTime - startTime) / 1000;
    
    return {
      timetable,
      generationTime,
    };
  },
});

interface TimetableParameters {
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

interface ClassInfo {
  subject: string;
  faculty: string;
  room: string;
  color?: string;
}

interface Batch {
  id: number;
  name: string;
  schedule: Record<string, Record<string, ClassInfo | null>>;
}

interface Timetable {
  batches: Batch[];
  fitness?: number;
  conflicts?: any[];
  algorithm?: string;
}

class TimetableGenerator {
  private courseData: { subjects: string[]; faculty: string[] };
  private parameters: TimetableParameters;
  private timeSlots: string[];
  private days: string[];
  private rooms: string[];
  private subjectColors: Record<string, string>;

  constructor(courseData: { subjects: string[]; faculty: string[] }, parameters: TimetableParameters) {
    this.courseData = courseData;
    this.parameters = parameters;
    this.days = parameters.workingDays;
    this.rooms = ["Room-101", "Room-102", "Room-103", "Lab-A", "Lab-B", "Hall-1", "Hall-2", "Auditorium"];
    
    // Generate time slots based on start and end time
    this.timeSlots = this.generateTimeSlots(parameters.startTime, parameters.endTime);
    
    // Generate distinct colors for subjects
    this.subjectColors = this.generateSubjectColors(courseData.subjects);
  }

  generateTimeSlots(startTime: string, endTime: string): string[] {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    // Generate hourly slots
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes && slots.length < this.parameters.maxClasses; minutes += 60) {
      const currentHour = Math.floor(minutes / 60);
      const currentMinute = minutes % 60;
      const nextHour = Math.floor((minutes + 60) / 60);
      const nextMinute = (minutes + 60) % 60;
      
      const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}-${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
      slots.push(timeSlot);
    }
    
    return slots;
  }

  generateSubjectColors(subjects: string[]): Record<string, string> {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
      '#14B8A6', '#F43F5E', '#8B5A2B', '#059669', '#7C3AED'
    ];
    
    const colorMap: Record<string, string> = {};
    subjects.forEach((subject, index) => {
      colorMap[subject] = colors[index % colors.length];
    });
    
    return colorMap;
  }

  async geneticAlgorithm() {
    const POPULATION_SIZE = 40;
    const GENERATIONS = 150;
    const MUTATION_RATE = 0.12;
    
    // Create initial population with better initialization
    let population: Timetable[] = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
      population.push(this.createOptimizedRandomTimetable());
    }
    
    for (let generation = 0; generation < GENERATIONS; generation++) {
      // Calculate fitness for each individual
      const fitnessScores: number[] = population.map(individual => this.calculateFitness(individual));
      
      // Sort by fitness (higher is better)
      const sortedIndices: number[] = fitnessScores
        .map((fitness: number, index: number) => ({ fitness, index }))
        .sort((a: any, b: any) => b.fitness - a.fitness)
        .map((item: any) => item.index);
      
      // Create new generation
      const newPopulation: Timetable[] = [];
      
      // Keep elite individuals (top 25%)
      const eliteSize = Math.floor(POPULATION_SIZE * 0.25);
      for (let i = 0; i < eliteSize; i++) {
        newPopulation.push(JSON.parse(JSON.stringify(population[sortedIndices[i]])));
      }
      
      // Generate offspring through crossover and mutation
      while (newPopulation.length < POPULATION_SIZE) {
        const parent1 = this.tournamentSelection(population, fitnessScores);
        const parent2 = this.tournamentSelection(population, fitnessScores);
        
        let offspring = this.crossover(parent1, parent2);
        
        if (Math.random() < MUTATION_RATE) {
          offspring = this.mutate(offspring);
        }
        
        // Apply gap filling optimization
        offspring = this.fillGaps(offspring);
        
        newPopulation.push(offspring);
      }
      
      population = newPopulation;
    }
    
    // Select best individual and apply final optimization
    const finalFitnessScores: number[] = population.map(individual => this.calculateFitness(individual));
    const bestIndex = finalFitnessScores.indexOf(Math.max(...finalFitnessScores));
    let bestTimetable = population[bestIndex];
    
    // Apply intensive gap filling to the best solution
    bestTimetable = this.intensiveGapFilling(bestTimetable);
    
    bestTimetable.fitness = this.calculateFitness(bestTimetable);
    bestTimetable.conflicts = this.detectConflicts(bestTimetable);
    bestTimetable.algorithm = 'genetic';
    
    return bestTimetable;
  }

  async constraintProgramming() {
    const timetable = this.createEmptyTimetable();
    
    // Calculate optimal number of classes needed
    const totalClassesNeeded = this.calculateOptimalClassCount();
    
    // Create assignments with strategic distribution
    const assignments: Array<{
      subject: string;
      faculty: string;
      batch: number;
      room: string;
      priority: number;
    }> = [];
    
    const subjects = this.courseData.subjects.slice(0, this.parameters.subjects);
    
    // Generate more classes to fill available slots
    const extraFrequency = Math.ceil(totalClassesNeeded / (subjects.length * this.parameters.batches));
    const actualFrequency = Math.max(this.parameters.frequency, extraFrequency);
    
    subjects.forEach((subject, subjectIndex) => {
      for (let freq = 0; freq < actualFrequency; freq++) {
        for (let batch = 0; batch < this.parameters.batches; batch++) {
          assignments.push({
            subject,
            faculty: this.courseData.faculty[subjectIndex % this.courseData.faculty.length],
            batch,
            room: this.rooms[batch % Math.min(this.rooms.length, this.parameters.classrooms)],
            priority: Math.random() + (freq < this.parameters.frequency ? 1 : 0.5) // Prioritize required frequency
          });
        }
      }
    });
    
    // Sort by priority for better assignment order
    assignments.sort((a, b) => b.priority - a.priority);
    
    // Assign to slots using constraint satisfaction with gap minimization
    for (const assignment of assignments) {
      let placed = false;
      const attempts = this.getOptimalSlotOrder();
      
      for (const attempt of attempts) {
        const batch = timetable.batches[assignment.batch];
        
        if (!batch.schedule[attempt.day][attempt.slot]) {
          if (this.isValidAssignment(timetable, { ...assignment, day: attempt.day, slot: attempt.slot })) {
            batch.schedule[attempt.day][attempt.slot] = {
              subject: assignment.subject,
              faculty: assignment.faculty,
              room: assignment.room,
              color: this.subjectColors[assignment.subject]
            };
            placed = true;
            break;
          }
        }
      }
    }
    
    // Apply gap filling optimization
    const optimizedTimetable = this.fillGaps(timetable);
    
    optimizedTimetable.fitness = this.calculateFitness(optimizedTimetable);
    optimizedTimetable.conflicts = this.detectConflicts(optimizedTimetable);
    optimizedTimetable.algorithm = 'constraint';
    
    return optimizedTimetable;
  }

  async hybridAlgorithm() {
    // Phase 1: Use constraint programming for initial solution
    const cpSolution = await this.constraintProgramming();
    
    // Phase 2: Use genetic algorithm to optimize
    const population: Timetable[] = [cpSolution];
    
    // Generate variations with gap filling
    for (let i = 1; i < 20; i++) {
      let variation = this.mutate(JSON.parse(JSON.stringify(cpSolution)));
      variation = this.fillGaps(variation);
      population.push(variation);
    }
    
    // Run enhanced genetic algorithm
    for (let gen = 0; gen < 50; gen++) {
      const fitnessScores: number[] = population.map(individual => this.calculateFitness(individual));
      
      const bestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
      const best = JSON.parse(JSON.stringify(population[bestIndex]));
      
      // Replace worst individuals with optimized mutations
      const worstIndices = fitnessScores
        .map((fitness: number, index: number) => ({ fitness, index }))
        .sort((a: any, b: any) => a.fitness - b.fitness)
        .slice(0, 7)
        .map((item: any) => item.index);
      
      worstIndices.forEach(index => {
        let mutated = this.mutate(JSON.parse(JSON.stringify(best)));
        mutated = this.fillGaps(mutated);
        population[index] = mutated;
      });
    }
    
    const finalFitnessScores: number[] = population.map(individual => this.calculateFitness(individual));
    const finalBestIndex = finalFitnessScores.indexOf(Math.max(...finalFitnessScores));
    let finalSolution = population[finalBestIndex];
    
    // Apply final intensive optimization
    finalSolution = this.intensiveGapFilling(finalSolution);
    
    finalSolution.fitness = this.calculateFitness(finalSolution);
    finalSolution.conflicts = this.detectConflicts(finalSolution);
    finalSolution.algorithm = 'hybrid';
    
    return finalSolution;
  }

  // NEW: Calculate optimal number of classes to ensure at least one free period per week
  calculateOptimalClassCount(): number {
    const totalSlotsPerBatch = this.days.length * this.parameters.maxClasses;
    const minFreePeriods = 1; // At least one free period per batch per week
    
    // Calculate maximum classes per batch while ensuring free periods
    const maxClassesPerBatch = totalSlotsPerBatch - minFreePeriods;
    
    // Target 80-85% utilization but never exceed maxClassesPerBatch
    const targetUtilization = 0.82;
    const targetClassesPerBatch = Math.floor(totalSlotsPerBatch * targetUtilization);
    
    const optimalClassesPerBatch = Math.min(targetClassesPerBatch, maxClassesPerBatch);
    
    return optimalClassesPerBatch * this.parameters.batches;
  }

  // NEW: Get optimal slot assignment order to minimize gaps
  getOptimalSlotOrder(): Array<{day: string, slot: string}> {
    const attempts = [];
    
    // Prioritize filling slots sequentially to avoid gaps
    for (const day of this.days) {
      for (let slotIndex = 0; slotIndex < Math.min(this.timeSlots.length, this.parameters.maxClasses); slotIndex++) {
        const slot = this.timeSlots[slotIndex];
        attempts.push({ day, slot });
      }
    }
    
    return attempts;
  }

  // NEW: Create optimized random timetable with better slot filling
  createOptimizedRandomTimetable(): Timetable {
    const timetable = this.createEmptyTimetable();
    const subjects = this.courseData.subjects.slice(0, this.parameters.subjects);
    
    // Calculate how many classes we need to fill most slots
    const totalAvailableSlots = this.days.length * this.parameters.maxClasses;
    const targetClassesPerBatch = Math.floor(totalAvailableSlots * 0.8); // Fill 80% of slots
    const classesPerSubject = Math.ceil(targetClassesPerBatch / subjects.length);
    
    const assignments: Array<{
      subject: string;
      faculty: string;
      batch: number;
      room: string;
    }> = [];
    
    subjects.forEach(subject => {
      for (let freq = 0; freq < classesPerSubject; freq++) {
        for (let batch = 0; batch < this.parameters.batches; batch++) {
          assignments.push({
            subject,
            faculty: this.courseData.faculty[Math.floor(Math.random() * this.courseData.faculty.length)],
            batch,
            room: this.rooms[Math.floor(Math.random() * Math.min(this.rooms.length, this.parameters.classrooms))]
          });
        }
      }
    });
    
    // Assign classes sequentially to minimize gaps
    assignments.forEach(assignment => {
      let placed = false;
      const batch = timetable.batches[assignment.batch];
      
      // Try to place in sequential order first
      for (const day of this.days) {
        if (placed) break;
        for (let slotIndex = 0; slotIndex < Math.min(this.timeSlots.length, this.parameters.maxClasses); slotIndex++) {
          const slot = this.timeSlots[slotIndex];
          
          if (!batch.schedule[day][slot]) {
            batch.schedule[day][slot] = {
              subject: assignment.subject,
              faculty: assignment.faculty,
              room: assignment.room,
              color: this.subjectColors[assignment.subject]
            };
            placed = true;
            break;
          }
        }
      }
    });
    
    return timetable;
  }

  // NEW: Fill gaps while preserving at least one free period per week
  fillGaps(timetable: Timetable): Timetable {
    const optimized = JSON.parse(JSON.stringify(timetable));
    const subjects = this.courseData.subjects.slice(0, this.parameters.subjects);
    
    optimized.batches.forEach((batch: Batch) => {
      // Count filled slots and find empty ones
      let currentFilledSlots = 0;
      const emptySlots: Array<{day: string, slot: string}> = [];
      
      this.days.forEach(day => {
        this.timeSlots.slice(0, this.parameters.maxClasses).forEach(slot => {
          if (batch.schedule[day][slot]) {
            currentFilledSlots++;
          } else {
            emptySlots.push({ day, slot });
          }
        });
      });
      
      // Reserve at least 1 free period per week
      const totalSlots = this.days.length * this.parameters.maxClasses;
      const maxAllowedClasses = totalSlots - 1;
      const slotsToFill = Math.min(emptySlots.length, maxAllowedClasses - currentFilledSlots);
      
      // Fill only the calculated number of slots to preserve free periods
      emptySlots.slice(0, Math.max(0, slotsToFill)).forEach(emptySlot => {
        // Choose subject that appears least frequently for this batch
        const subjectCounts: Record<string, number> = {};
        subjects.forEach(subject => {
          subjectCounts[subject] = 0;
        });
        
        // Count existing classes for each subject
        this.days.forEach(day => {
          this.timeSlots.forEach(slot => {
            const classInfo = batch.schedule[day][slot];
            if (classInfo && subjectCounts.hasOwnProperty(classInfo.subject)) {
              subjectCounts[classInfo.subject]++;
            }
          });
        });
        
        // Find subject with minimum count
        const minCount = Math.min(...Object.values(subjectCounts));
        const candidateSubjects = subjects.filter(subject => subjectCounts[subject] === minCount);
        const selectedSubject = candidateSubjects[Math.floor(Math.random() * candidateSubjects.length)];
        
        // Create assignment for the empty slot
        const assignment = {
          subject: selectedSubject,
          faculty: this.courseData.faculty[subjects.indexOf(selectedSubject) % this.courseData.faculty.length],
          room: this.rooms[batch.id % Math.min(this.rooms.length, this.parameters.classrooms)],
          batch: batch.id,
          day: emptySlot.day,
          slot: emptySlot.slot
        };
        
        // Check if assignment is valid (no conflicts)
        if (this.isValidAssignment(optimized, assignment)) {
          batch.schedule[emptySlot.day][emptySlot.slot] = {
            subject: assignment.subject,
            faculty: assignment.faculty,
            room: assignment.room,
            color: this.subjectColors[assignment.subject]
          };
        }
      });
    });
    
    return optimized;
  }

  // NEW: Intensive gap filling for final optimization
  intensiveGapFilling(timetable: Timetable): Timetable {
    let optimized = JSON.parse(JSON.stringify(timetable));
    
    // Apply gap filling multiple times for better results
    for (let iteration = 0; iteration < 3; iteration++) {
      optimized = this.fillGaps(optimized);
      
      // Try to resolve conflicts by swapping classes
      optimized = this.resolveConflictsBySwapping(optimized);
    }
    
    return optimized;
  }

  // NEW: Resolve conflicts by intelligently swapping classes
  resolveConflictsBySwapping(timetable: Timetable): Timetable {
    const optimized = JSON.parse(JSON.stringify(timetable));
    const conflicts = this.detectConflicts(optimized);
    
    conflicts.forEach(conflict => {
      if (conflict.type === 'faculty_conflict') {
        // Try to move one of the conflicting classes to an empty slot
        const batch1 = optimized.batches[conflict.batches[0]];
        const batch2 = optimized.batches[conflict.batches[1]];
        
        const class1 = batch1.schedule[conflict.day][conflict.slot];
        const class2 = batch2.schedule[conflict.day][conflict.slot];
        
        // Try to move class1 to an empty slot
        let moved = false;
        for (const day of this.days) {
          if (moved) break;
          for (const slot of this.timeSlots.slice(0, this.parameters.maxClasses)) {
            if (!batch1.schedule[day][slot]) {
              // Check if moving here creates new conflicts
              const testAssignment = {
                ...class1,
                batch: conflict.batches[0],
                day,
                slot
              };
              
              if (this.isValidAssignment(optimized, testAssignment)) {
                batch1.schedule[day][slot] = class1;
                batch1.schedule[conflict.day][conflict.slot] = null;
                moved = true;
                break;
              }
            }
          }
        }
      }
    });
    
    return optimized;
  }

  createEmptyTimetable(): Timetable {
    const timetable: Timetable = { batches: [] };
    
    for (let b = 0; b < this.parameters.batches; b++) {
      const batch: Batch = {
        id: b,
        name: `Batch ${b + 1}`,
        schedule: {}
      };
      
      this.days.forEach(day => {
        batch.schedule[day] = {};
        this.timeSlots.slice(0, this.parameters.maxClasses).forEach(slot => {
          batch.schedule[day][slot] = null;
        });
      });
      
      timetable.batches.push(batch);
    }
    
    return timetable;
  }

  createRandomTimetable(): Timetable {
    return this.createOptimizedRandomTimetable();
  }

  calculateFitness(timetable: Timetable): number {
    let fitness = 100;
    const conflicts = this.detectConflicts(timetable);
    
    // Heavily penalize conflicts
    fitness -= conflicts.length * 25;
    
    // Calculate slot utilization and heavily reward high utilization
    let filledSlots = 0;
    let totalSlots = 0;
    let gapPenalty = 0;
    
    timetable.batches.forEach((batch: Batch) => {
      Object.values(batch.schedule).forEach((day: any) => {
        const daySlots = Object.values(day);
        totalSlots += daySlots.length;
        
        // Count filled slots
        daySlots.forEach((slot: any) => {
          if (slot) filledSlots++;
        });
        
        // Penalize gaps in the middle of the day
        const daySchedule = this.timeSlots.slice(0, this.parameters.maxClasses).map(slot => day[slot]);
        gapPenalty += this.calculateGapPenalty(daySchedule);
      });
    });
    
    const fillRatio = totalSlots > 0 ? filledSlots / totalSlots : 0;
    
    // Reward good utilization but not 100% (leave room for free periods)
    const optimalUtilization = 0.85; // Target 85% utilization
    const utilizationScore = fillRatio <= optimalUtilization ? 
      fillRatio * 50 : 
      optimalUtilization * 50 - (fillRatio - optimalUtilization) * 20; // Penalize over-utilization
    fitness += utilizationScore;
    
    // Penalize gaps heavily (up to -30 points)
    fitness -= gapPenalty * 5;
    
    // Reward even distribution of subjects
    const subjectDistribution = this.calculateSubjectDistribution(timetable);
    fitness += subjectDistribution * 8;
    
    // Bonus for very high utilization (>80%)
    if (fillRatio > 0.8) {
      fitness += (fillRatio - 0.8) * 100; // Extra bonus for high utilization
    }
    
    return Math.max(0, fitness);
  }

  // NEW: Calculate penalty for gaps in daily schedule
  calculateGapPenalty(daySchedule: any[]): number {
    let penalty = 0;
    let inSequence = false;
    
    for (let i = 0; i < daySchedule.length; i++) {
      if (daySchedule[i]) {
        inSequence = true;
      } else if (inSequence) {
        // This is a gap in the middle of classes
        // Check if there are more classes after this gap
        let hasClassesAfter = false;
        for (let j = i + 1; j < daySchedule.length; j++) {
          if (daySchedule[j]) {
            hasClassesAfter = true;
            break;
          }
        }
        if (hasClassesAfter) {
          penalty += 2; // Penalize gaps in the middle
        }
      }
    }
    
    return penalty;
  }

  calculateSubjectDistribution(timetable: Timetable): number {
    const subjectCounts: Record<string, number> = {};
    
    timetable.batches.forEach((batch: Batch) => {
      Object.values(batch.schedule).forEach((day: any) => {
        Object.values(day).forEach((slot: any) => {
          if (slot && slot.subject) {
            subjectCounts[slot.subject] = (subjectCounts[slot.subject] || 0) + 1;
          }
        });
      });
    });
    
    const counts = Object.values(subjectCounts);
    if (counts.length === 0) return 0;
    
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((acc, count) => acc + Math.pow(count - mean, 2), 0) / counts.length;
    
    return Math.max(0, 15 - variance); // Lower variance = better distribution
  }

  detectConflicts(timetable: Timetable) {
    const conflicts: any[] = [];
    
    timetable.batches.forEach((batch: Batch, batchIndex: number) => {
      Object.keys(batch.schedule).forEach(day => {
        Object.keys(batch.schedule[day]).forEach(slot => {
          const class1 = batch.schedule[day][slot];
          if (!class1) return;
          
          timetable.batches.forEach((otherBatch: Batch, otherBatchIndex: number) => {
            if (batchIndex === otherBatchIndex) return;
            
            const class2 = otherBatch.schedule[day][slot];
            if (class2) {
              // Faculty conflict
              if (class1.faculty === class2.faculty) {
                conflicts.push({
                  type: 'faculty_conflict',
                  description: `Faculty ${class1.faculty} assigned to multiple batches`,
                  details: `${day} ${slot}: Batch ${batchIndex + 1} and Batch ${otherBatchIndex + 1}`,
                  day,
                  slot,
                  batches: [batchIndex, otherBatchIndex],
                  faculty: class1.faculty,
                  severity: 'high'
                });
              }
              
              // Room conflict (excluding labs which can be shared)
              if (class1.room === class2.room && !class1.room.includes('Lab')) {
                conflicts.push({
                  type: 'room_conflict',
                  description: `Room ${class1.room} double-booked`,
                  details: `${day} ${slot}: ${class1.subject} and ${class2.subject}`,
                  day,
                  slot,
                  batches: [batchIndex, otherBatchIndex],
                  room: class1.room,
                  severity: 'medium'
                });
              }
            }
          });
        });
      });
    });
    
    return conflicts;
  }

  tournamentSelection(population: Timetable[], fitnessScores: number[], tournamentSize = 4): Timetable {
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push({ individual: population[randomIndex], fitness: fitnessScores[randomIndex] });
    }
    
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0].individual;
  }

  crossover(parent1: Timetable, parent2: Timetable): Timetable {
    const offspring = JSON.parse(JSON.stringify(parent1));
    
    offspring.batches.forEach((batch: any, batchIndex: number) => {
      const parent2Batch = parent2.batches[batchIndex];
      
      Object.keys(batch.schedule).forEach((day, dayIndex) => {
        if (dayIndex >= this.days.length / 2) {
          Object.keys(batch.schedule[day]).forEach(slot => {
            if (parent2Batch.schedule[day][slot] && !batch.schedule[day][slot]) {
              batch.schedule[day][slot] = JSON.parse(JSON.stringify(parent2Batch.schedule[day][slot]));
            }
          });
        }
      });
    });
    
    return offspring;
  }

  mutate(individual: Timetable): Timetable {
    const mutated = JSON.parse(JSON.stringify(individual));
    
    // Enhanced mutation: try to fill empty slots while swapping
    const batch = mutated.batches[Math.floor(Math.random() * mutated.batches.length)];
    const days = Object.keys(batch.schedule);
    
    // Find empty and filled slots
    const emptySlots: Array<{day: string, slot: string}> = [];
    const filledSlots: Array<{day: string, slot: string}> = [];
    
    days.forEach(day => {
      Object.keys(batch.schedule[day]).forEach(slot => {
        if (batch.schedule[day][slot]) {
          filledSlots.push({ day, slot });
        } else {
          emptySlots.push({ day, slot });
        }
      });
    });
    
    // If we have empty slots, try to move a class there
    if (emptySlots.length > 0 && filledSlots.length > 0) {
      const randomEmpty = emptySlots[Math.floor(Math.random() * emptySlots.length)];
      const randomFilled = filledSlots[Math.floor(Math.random() * filledSlots.length)];
      
      // Move class to empty slot
      batch.schedule[randomEmpty.day][randomEmpty.slot] = batch.schedule[randomFilled.day][randomFilled.slot];
      batch.schedule[randomFilled.day][randomFilled.slot] = null;
    } else {
      // Standard swap mutation
      const day1 = days[Math.floor(Math.random() * days.length)];
      const day2 = days[Math.floor(Math.random() * days.length)];
      
      const slots1 = Object.keys(batch.schedule[day1]);
      const slots2 = Object.keys(batch.schedule[day2]);
      
      const slot1 = slots1[Math.floor(Math.random() * slots1.length)];
      const slot2 = slots2[Math.floor(Math.random() * slots2.length)];
      
      const temp = batch.schedule[day1][slot1];
      batch.schedule[day1][slot1] = batch.schedule[day2][slot2];
      batch.schedule[day2][slot2] = temp;
    }
    
    return mutated;
  }

  isValidAssignment(timetable: Timetable, assignment: any): boolean {
    for (const batch of timetable.batches) {
      if (batch.id === assignment.batch) continue;
      
      const existingClass = batch.schedule[assignment.day][assignment.slot];
      if (existingClass) {
        // Faculty conflict
        if (existingClass.faculty === assignment.faculty) {
          return false;
        }
        
        // Room conflict (labs can be shared)
        if (existingClass.room === assignment.room && !assignment.room.includes('Lab')) {
          return false;
        }
      }
    }
    
    return true;
  }
}
