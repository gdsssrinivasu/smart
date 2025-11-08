import { useState } from "react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
}

export function ExportButtons({ 
  timetable, 
  workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  startTime = "09:00",
  endTime = "17:00",
  maxClasses = 6
}: Props) {
  const [isExporting, setIsExporting] = useState(false);

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

  const exportToPDF = () => {
    try {
      setIsExporting(true);
      const doc = new jsPDF('landscape', 'mm', 'a4');

      timetable.batches.forEach((batch, batchIndex) => {
        if (batchIndex > 0) {
          doc.addPage('landscape');
        }

        // Header with enhanced styling
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, 297, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Smart Timetable Generator', 148.5, 16, { align: 'center' });

        // Batch title with background
        doc.setFillColor(239, 246, 255);
        doc.rect(0, 25, 297, 20, 'F');
        
        doc.setTextColor(30, 64, 175);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(batch.name, 20, 37);

        // Metadata in header area
        doc.setTextColor(75, 85, 99);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 42);
        doc.text(`Fitness: ${timetable.fitness.toFixed(1)}%`, 100, 42);
        doc.text(`Algorithm: ${timetable.algorithm}`, 160, 42);
        doc.text(`Conflicts: ${timetable.conflicts.length}`, 220, 42);

        // Prepare table data
        const tableData = timeSlots.map(timeSlot => {
          const row = [timeSlot];
          workingDays.forEach(day => {
            const classInfo = batch.schedule[day]?.[timeSlot];
            if (classInfo) {
              row.push(`${classInfo.subject}\n${classInfo.faculty}\n${classInfo.room}`);
            } else {
              row.push('Free');
            }
          });
          return row;
        });

        // Calculate available space and adjust table to fit on one page
        const pageHeight = 210; // A4 landscape height
        const headerHeight = 50;
        const availableHeight = pageHeight - headerHeight - 20; // 20mm margin
        
        const rowHeight = Math.min(12, availableHeight / (timeSlots.length + 1)); // +1 for header

        autoTable(doc, {
          head: [['Time Slot', ...workingDays]],
          body: tableData,
          startY: 50,
          theme: 'grid',
          styles: {
            fontSize: Math.min(9, rowHeight * 0.6),
            cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
            lineColor: [209, 213, 219],
            lineWidth: 0.5,
            textColor: [31, 41, 55],
            font: 'helvetica',
            minCellHeight: rowHeight
          },
          headStyles: {
            fillColor: [239, 246, 255],
            textColor: [30, 64, 175],
            fontSize: Math.min(10, rowHeight * 0.7),
            fontStyle: 'bold',
            cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
            lineColor: [147, 197, 253],
            lineWidth: 1,
            minCellHeight: rowHeight
          },
          columnStyles: {
            0: { 
              fillColor: [249, 250, 251],
              fontStyle: 'bold',
              halign: 'center',
              cellWidth: 25
            }
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          didParseCell: function(data) {
            if (data.row.index >= 0 && data.column.index > 0) {
              const timeSlot = timeSlots[data.row.index];
              const day = workingDays[data.column.index - 1];
              const hasConflict = timetable.conflicts.some(conflict => 
                conflict.day === day && 
                conflict.slot === timeSlot && 
                conflict.batches.includes(batchIndex)
              );
              
              if (hasConflict) {
                data.cell.styles.fillColor = [254, 226, 226];
                data.cell.styles.lineColor = [248, 113, 113];
                data.cell.styles.lineWidth = 1;
              }
            }
          }
        });
      });

      const timestamp = new Date().toISOString().split('T')[0];
      doc.save(`Smart-Timetable-${timestamp}.pdf`);
      toast.success('Timetable exported as PDF');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export timetable');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    try {
      setIsExporting(true);
      const workbook = XLSX.utils.book_new();

      timetable.batches.forEach((batch) => {
        // Create worksheet data
        const wsData = [];
        
        // Header row
        const headerRow = ['Time Slot', ...workingDays];
        wsData.push(headerRow);

        // Data rows
        timeSlots.forEach(timeSlot => {
          const row = [timeSlot];
          workingDays.forEach(day => {
            const classInfo = batch.schedule[day]?.[timeSlot];
            if (classInfo) {
              row.push(`${classInfo.subject}\n${classInfo.faculty}\n${classInfo.room}`);
            } else {
              row.push('Free');
            }
          });
          wsData.push(row);
        });

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        const colWidths = [
          { wch: 15 }, // Time slot column
          ...workingDays.map(() => ({ wch: 20 })) // Day columns
        ];
        ws['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, ws, batch.name);
      });

      // Add summary sheet
      const summaryData = [
        ['Timetable Summary'],
        ['Generated', new Date().toLocaleDateString()],
        ['Fitness Score', `${timetable.fitness.toFixed(1)}%`],
        ['Algorithm', timetable.algorithm],
        ['Total Conflicts', timetable.conflicts.length.toString()],
        ['Total Batches', timetable.batches.length.toString()],
        ['Working Days', workingDays.join(', ')],
        ['Time Range', `${startTime} - ${endTime}`],
        ['Max Classes per Day', maxClasses.toString()]
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');

      // Save file
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Smart-Timetable-${timestamp}.xlsx`);
      
      toast.success('Timetable exported as Excel file');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export timetable');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={exportToPDF}
        disabled={isExporting}
        className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Exporting...
          </>
        ) : (
          <>
            📄 Export PDF
          </>
        )}
      </button>
      
      <button
        onClick={exportToExcel}
        disabled={isExporting}
        className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Exporting...
          </>
        ) : (
          <>
            📊 Export Excel
          </>
        )}
      </button>
    </div>
  );
}
