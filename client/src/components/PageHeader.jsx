import { motion } from 'motion/react';

export default function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  children,
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <span className="relative hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-xl shadow-indigo-500/25 sm:grid">
            <Icon className="h-6 w-6" />
            <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/30" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-500">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </motion.header>
  );
}
