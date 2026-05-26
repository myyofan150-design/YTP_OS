"use client";

import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { StepProps, SalaryComponentForm } from "../AddEmployeeWizard";

function fmt(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function ComponentRow({
  comp, onToggle, onAmount, onName, onRemove,
}: {
  comp: SalaryComponentForm;
  onToggle: () => void;
  onAmount: (v: string) => void;
  onName: (v: string) => void;
  onRemove?: () => void;
}) {
  const active = comp.enabled || comp.isMandatory;
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 transition-opacity ${!active ? "opacity-40" : ""}`}>
      {comp.isMandatory ? (
        <div className="w-4 h-4 shrink-0" />
      ) : (
        <input
          type="checkbox"
          checked={comp.enabled}
          onChange={onToggle}
          className="w-4 h-4 accent-primary shrink-0 cursor-pointer"
        />
      )}
      {comp.isCustom ? (
        <Input
          className="h-8 text-xs flex-1"
          placeholder="Component name"
          value={comp.name}
          onChange={e => onName(e.target.value)}
        />
      ) : (
        <span className="flex-1 text-xs text-foreground/80 truncate">{comp.name}</span>
      )}
      {comp.isMandatory && (
        <span className="text-[10px] text-primary/60 font-medium px-1.5 py-0.5 bg-primary/8 rounded">req</span>
      )}
      <Input
        type="number"
        min={0}
        className="h-8 text-xs w-28 text-right font-mono"
        placeholder="0"
        value={comp.amount}
        disabled={!active}
        onChange={e => onAmount(e.target.value)}
      />
      {comp.isCustom && onRemove ? (
        <button type="button" onClick={onRemove} className="text-muted-foreground/40 hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="w-3.5 h-3.5 shrink-0" />
      )}
    </div>
  );
}

export function Step3SalaryStructure({ formData, onChange }: StepProps) {
  const { salaryComponents } = formData;
  const earnings   = salaryComponents.filter(c => c.componentType === "earning");
  const deductions = salaryComponents.filter(c => c.componentType === "deduction");

  const gross = earnings  .filter(c => c.enabled || c.isMandatory).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const deduc = deductions.filter(c => c.enabled || c.isMandatory).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const net   = gross - deduc;

  function update(id: string, patch: Partial<SalaryComponentForm>) {
    onChange({ salaryComponents: salaryComponents.map(c => c.id === id ? { ...c, ...patch } : c) });
  }

  function addCustom(type: "earning" | "deduction") {
    const newId = `custom_${Date.now()}`;
    const existing = salaryComponents.filter(c => c.componentType === type);
    onChange({
      salaryComponents: [
        ...salaryComponents,
        { id: newId, componentType: type, name: "", amount: "", isMandatory: false, isCustom: true, enabled: true, sortOrder: existing.length + 1 },
      ],
    });
  }

  function remove(id: string) {
    onChange({ salaryComponents: salaryComponents.filter(c => c.id !== id) });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Earnings */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Earnings</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Monthly allowances</p>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-600 font-mono">₹{fmt(gross)}</span>
          </div>
          <div className="px-4 pb-2 pt-1">
            {earnings.map(c => (
              <ComponentRow
                key={c.id}
                comp={c}
                onToggle={() => update(c.id, { enabled: !c.enabled })}
                onAmount={v  => update(c.id, { amount: v })}
                onName={v    => update(c.id, { name: v })}
                onRemove={c.isCustom ? () => remove(c.id) : undefined}
              />
            ))}
          </div>
          <div className="px-4 pb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs w-full text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/30"
              onClick={() => addCustom("earning")}
            >
              <Plus className="w-3 h-3 mr-1.5" /> Add Custom Earning
            </Button>
          </div>
        </div>

        {/* Deductions */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-red-500/5">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Deductions</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Tax, PF, and recoveries</p>
              </div>
            </div>
            <span className="text-sm font-bold text-red-500 font-mono">₹{fmt(deduc)}</span>
          </div>
          <div className="px-4 pb-2 pt-1">
            {deductions.map(c => (
              <ComponentRow
                key={c.id}
                comp={c}
                onToggle={() => update(c.id, { enabled: !c.enabled })}
                onAmount={v  => update(c.id, { amount: v })}
                onName={v    => update(c.id, { name: v })}
                onRemove={c.isCustom ? () => remove(c.id) : undefined}
              />
            ))}
          </div>
          <div className="px-4 pb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs w-full text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/30"
              onClick={() => addCustom("deduction")}
            >
              <Plus className="w-3 h-3 mr-1.5" /> Add Custom Deduction
            </Button>
          </div>
        </div>
      </div>

      {/* Net summary */}
      <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border">
          <div className="px-5 py-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Gross Earnings</p>
            <p className="text-lg font-bold text-emerald-600 font-mono">₹{fmt(gross)}</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Total Deductions</p>
            <p className="text-lg font-bold text-red-500 font-mono">₹{fmt(deduc)}</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Net Take-Home</p>
            <p className="text-lg font-bold text-foreground font-mono">₹{fmt(net)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
