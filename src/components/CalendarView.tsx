import { Assignment } from "@/types/assignment";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  assignments: Assignment[];
}

export function CalendarView({ assignments }: CalendarViewProps) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun

  const getAssignmentsForDay = (day: Date) =>
    assignments.filter((a) => isSameDay(a.dueDate, day));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">Calendar</h2>
        <p className="text-muted-foreground mt-1">{format(now, "MMMM yyyy")}</p>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-secondary/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="border-t border-border min-h-[80px]" />
          ))}
          {days.map((day) => {
            const dayAssignments = getAssignmentsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-t border-border min-h-[80px] p-2",
                  isToday(day) && "bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    isToday(day) ? "text-primary font-bold" : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-1">
                  {dayAssignments.slice(0, 2).map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded truncate font-medium",
                        a.status === "completed"
                          ? "bg-accent/20 text-accent"
                          : a.status === "overdue"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {a.title}
                    </div>
                  ))}
                  {dayAssignments.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{dayAssignments.length - 2} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
