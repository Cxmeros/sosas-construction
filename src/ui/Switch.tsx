/** On/off switch (design 1b/1c): square, 52 × 30 inside a 48 px touch target. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        onChange(!checked);
      }}
      className="flex min-h-12 min-w-16 flex-none items-center justify-end"
    >
      <span
        className={`relative block h-[30px] w-[52px] rounded-[2px] transition-colors ${checked ? 'bg-red-700' : 'bg-field'}`}
      >
        <span
          className={`absolute top-[3px] size-6 rounded-[1px] bg-surface transition-[left] ${checked ? 'left-[25px]' : 'left-[3px]'}`}
        />
      </span>
    </button>
  );
}
