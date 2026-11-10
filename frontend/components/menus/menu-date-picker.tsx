"use client";

import { useId } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatMenuDate, shiftMenuDate } from "@/lib/menus/date";
import { cn } from "@/lib/utils";

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface MenuDatePickerProps {
  date: string;
  today: string;
  lastDate: string;
  onChange: (date: string) => void;
}

function CalendarMonth({ month, date, today, lastDate, onChange }: MenuDatePickerProps & { month: string }) {
  const headingId = useId();
  const firstDay = new Date(`${month}-01T12:00:00Z`);
  const lastDay = new Date(firstDay);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-2 text-center text-sm font-semibold">{monthLabel.format(firstDay)}</h3>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {weekdays.map((day) => <span key={day} aria-hidden="true" className="py-1 text-xs text-muted-foreground">{day}</span>)}
        {Array.from({ length: firstDay.getUTCDay() }, (_, index) => <span key={`space-${index}`} aria-hidden="true" />)}
        {Array.from({ length: lastDay.getUTCDate() }, (_, index) => {
          const day = index + 1;
          const value = `${month}-${String(day).padStart(2, "0")}`;
          return (
            <DialogClose key={value} asChild>
              <Button type="button" variant={value === date ? "default" : "ghost"}
                className={cn("w-full px-0 tabular-nums", value !== date && "text-foreground disabled:text-muted-foreground")}
                disabled={value < today || value > lastDate}
                aria-label={`${formatMenuDate(value)}${value === today ? " (Today)" : ""}`}
                aria-current={value === today ? "date" : undefined}
                aria-pressed={value === date}
                onClick={() => onChange(value)}>
                {day}
              </Button>
            </DialogClose>
          );
        })}
      </div>
    </section>
  );
}

export function MenuDatePicker({ date, today, lastDate, onChange }: MenuDatePickerProps) {
  const firstMonth = today.slice(0, 7);
  const lastMonth = lastDate.slice(0, 7);
  const months = firstMonth === lastMonth ? [firstMonth] : [firstMonth, lastMonth];

  return (
    <div className="w-full sm:w-72">
      <p className="mb-2 text-sm font-medium">Menu date</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="size-10" aria-label="Previous day"
          disabled={date === today} onClick={() => onChange(shiftMenuDate(date, -1))}><ChevronLeft aria-hidden="true" /></Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="h-10 min-w-0 flex-1 justify-between"
              aria-label={`Menu date: ${formatMenuDate(date)}${date === today ? " (Today)" : ""}`}>
              {date}{date === today ? " (Today)" : ""}<CalendarDays aria-hidden="true" />
            </Button>
          </DialogTrigger>
          <DialogContent className={cn("max-h-[85svh] overflow-y-auto p-4", months.length === 2 ? "max-w-xl" : "max-w-xs")}>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>Choose a menu date</DialogTitle>
              <DialogClose asChild><Button type="button" variant="outline" size="sm">Close</Button></DialogClose>
            </div>
            <DialogDescription className="sr-only">Choose from today and the following thirteen days.</DialogDescription>
            <div className={cn("grid gap-4", months.length === 2 && "sm:grid-cols-2")}>
              {months.map((month) => <CalendarMonth key={month} month={month} date={date} today={today} lastDate={lastDate} onChange={onChange} />)}
            </div>
          </DialogContent>
        </Dialog>
        <Button type="button" variant="outline" className="size-10" aria-label="Next day"
          disabled={date === lastDate} onClick={() => onChange(shiftMenuDate(date, 1))}><ChevronRight aria-hidden="true" /></Button>
      </div>
    </div>
  );
}
