type Props = {
  size?: number
  spent?: boolean
}

export function YinYangToken({ size = 32, spent = false }: Props) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} style={{ display: 'block', opacity: spent ? 0.3 : 1 }}>
      <circle cx={20} cy={20} r={18} fill="#f4e9d6" stroke="#241b15" strokeWidth={1.5} />
      <path
        d="M20 2 a18 18 0 0 1 0 36 a9 9 0 0 1 0 -18 a9 9 0 0 0 0 -18 Z"
        fill="#241b15"
      />
      <circle cx={20} cy={11} r={2} fill="#241b15" />
      <circle cx={20} cy={29} r={2} fill="#f4e9d6" />
    </svg>
  )
}
