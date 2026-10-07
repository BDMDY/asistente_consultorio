// Preset Tailwind + shadcn/ui. Los colores leen variables CSS: cambiar --brand-* re-marca todo.
const brand = Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map(n=>[n,`var(--brand-${n})`]));
module.exports = {
  theme:{extend:{
    colors:{brand,accent:'var(--accent-500)',ink:{900:'var(--ink-900)',700:'var(--ink-700)',500:'var(--ink-500)',300:'var(--ink-300)'},
      line:'var(--line)',bone:'var(--bone)',muted:'var(--muted)',
      border:'var(--line)',background:'var(--bone)',foreground:'var(--ink-900)',ring:'var(--brand-500)',
      primary:{DEFAULT:'var(--brand-700)',foreground:'#fff'},destructive:{DEFAULT:'var(--error-fg)',foreground:'#fff'}},
    borderRadius:{sm:'var(--r-sm)',md:'var(--r-md)',lg:'var(--r-lg)'},
    boxShadow:{sm:'var(--shadow-sm)',md:'var(--shadow-md)',lg:'var(--shadow-lg)'},
    backgroundImage:{hero:'var(--grad-hero)',accent:'var(--grad-accent)',btn:'var(--grad-btn)'},
    fontFamily:{sans:['var(--font-sans)']}}}
};
