export default function GlassCard({ children, className = '', glow = false }) {
  return (
    <div className={`bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 ${
      glow ? 'shadow-[0_0_20px_rgba(255,68,68,0.3)] border-danger' : ''
    } ${className}`}>
      {children}
    </div>
  );
}
