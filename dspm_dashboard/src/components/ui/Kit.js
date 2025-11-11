// src/components/ui/Kit.js
import React from "react";
import { ChevronDown } from "lucide-react";

export const Page = ({ title, action, children }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="h-title">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </div>
);

export const Card = ({ className = "", children }) => (
  <div className={`card card-pad ${className}`}>{children}</div>
);

export const Section = ({ title, right }) => (
  <div className="flex items-center justify-between mb-3">
    <p className="h-subtitle">{title}</p>
    {right}
  </div>
);

export const StatCard = ({ title, value, sub, Icon }) => (
  <Card>
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-600">{title}</p>
      {Icon ? <Icon className="w-4 h-4 text-gray-400" /> : null}
    </div>
    <div className="mt-3 flex items-end gap-2">
      <p className="text-2xl font-semibold">{value}</p>
      {sub ? <span className="text-xs text-gray-500 mb-0.5">{sub}</span> : null}
    </div>
    <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full">
      <div className="h-1.5 w-2/3 bg-primary-500 rounded-full" />
    </div>
  </Card>
);

export const FilterButton = ({ label, value = "All" }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600 hidden md:inline">{label}</span>
    <button className="btn">
      <span className="truncate max-w-[140px]">{value}</span>
      <ChevronDown className="w-4 h-4 text-gray-500" />
    </button>
  </div>
);
