import React, { useState } from 'react';
import { format, addMonths, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarWidgetProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  isExpanded: boolean;
  toggleExpand: () => void;
  reminderDates: string[]; // Array of YYYY-MM-DD strings
  taskDates: string[]; // Array of YYYY-MM-DD strings
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ 
  currentDate, 
  onDateSelect, 
  isExpanded, 
  toggleExpand,
  reminderDates,
  taskDates
}) => {
  const [displayDate, setDisplayDate] = useState(new Date());

  const prevMonth = () => setDisplayDate(addMonths(displayDate, -1));
  const nextMonth = () => setDisplayDate(addMonths(displayDate, 1));

  const monthStart = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
  const monthEnd = endOfMonth(displayDate);
  
  // Logic to find start of week (Sunday)
  const startDate = new Date(monthStart);
  startDate.setDate(monthStart.getDate() - monthStart.getDay());
  
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className={`transition-all duration-300 ease-in-out border-t border-pink-500/20 bg-black/20 backdrop-blur-md ${isExpanded ? 'h-96' : 'h-14'} overflow-hidden`}>
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-2 text-pink-500">
            <CalendarIcon size={18} />
            <span className="font-semibold text-sm">Calendar</span>
        </div>
        <div className="text-xs text-gray-400">
            {isExpanded ? 'Collapse' : format(currentDate, 'MMM dd, yyyy')}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0">
          <div className="flex justify-between items-center mb-4 text-white">
            <button onClick={prevMonth} className="p-1 hover:text-pink-500"><ChevronLeft size={16} /></button>
            <span className="font-bold">{format(displayDate, 'MMMM yyyy')}</span>
            <button onClick={nextMonth} className="p-1 hover:text-pink-500"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
              <div key={d} className="text-gray-500 font-semibold mb-2">{d}</div>
            ))}
            {calendarDays.map((day, idx) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isSelected = isSameDay(day, currentDate);
                const isCurrentMonth = isSameMonth(day, displayDate);
                const isToday = isSameDay(day, new Date());
                const hasReminder = reminderDates.includes(dayStr);
                const hasTasks = taskDates.includes(dayStr);
                
                return (
                    <button
                        key={idx}
                        onClick={() => onDateSelect(day)}
                        className={`
                            relative h-9 w-9 rounded-full flex flex-col items-center justify-center transition-colors
                            ${!isCurrentMonth ? 'text-gray-600' : 'text-gray-200'}
                            ${isSelected ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/50' : 'hover:bg-white/10'}
                            ${isToday && !isSelected ? 'border border-pink-500 text-pink-500' : ''}
                        `}
                    >
                        <span>{format(day, 'd')}</span>
                        <div className="flex gap-0.5 mt-0.5">
                            {hasTasks && !isSelected && (
                                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                            )}
                            {hasReminder && !isSelected && (
                                <div className="w-1 h-1 rounded-full bg-yellow-400"></div>
                            )}
                        </div>
                    </button>
                )
            })}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-[10px] text-gray-400">
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Tasks
            </div>
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div> Reminders
            </div>
          </div>
        </div>
      )}
    </div>
  );
};