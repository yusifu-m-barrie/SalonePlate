'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  delay?: number;
}

export function StatCard({ title, value, change, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-brand-gray text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change && <p className="text-green-400 text-xs mt-1">{change}</p>}
        </div>
        <div className="p-3 rounded-xl bg-brand-gold/20">
          <Icon className="w-5 h-5 text-brand-gold" />
        </div>
      </div>
    </motion.div>
  );
}
