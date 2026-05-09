import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { Assignment } from "@/types/assignment";
import { CalendarDays, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StudentCalendarProps {
  assignments: Assignment[];
}

export function StudentCalendar({ assignments }: StudentCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const selectedDateAssignments = assignments.filter((a) =>
    date ? isSameDay(new Date(a.due_date), date) : false
  );

  const modifiers = {
    booked: assignments.map((a) => new Date(a.due_date)),
  };

  const modifiersStyles = {
    booked: {
      fontWeight: "bold",
      color: "var(--primary)",
      backgroundColor: "var(--primary-foreground)",
      borderRadius: "50%",
    },
  };

  return (
    <Card className="border-border bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Academic Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-4">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex justify-center xl:block">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-xl border border-border/50 bg-background/40"
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
          </div>
          
          <div className="flex-1 px-4 pb-4 xl:pb-0">
            <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              {date ? format(date, "PPPP") : "Select a date"}
            </h4>
            
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {selectedDateAssignments.length === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground italic py-8 text-center"
                  >
                    No deadlines on this day.
                  </motion.p>
                ) : (
                  selectedDateAssignments.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-xl bg-secondary/40 border border-border/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {a.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {a.subject}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[9px] uppercase tracking-wider px-1.5 py-0",
                          a.priority === "urgent" ? "text-red-500 border-red-500/20" :
                          a.priority === "high" ? "text-orange-500 border-orange-500/20" :
                          "text-blue-500 border-blue-500/20"
                        )}>
                          {a.priority}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

