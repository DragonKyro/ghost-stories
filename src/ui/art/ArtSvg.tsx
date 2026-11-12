import type { CSSProperties, ReactNode } from 'react'

/** Props every art component accepts besides its own. */
export interface ArtBaseProps {
  /** Position when nested inside another <svg> (ignored in HTML flow). */
  x?: number
  y?: number
  className?: string
  style?: CSSProperties
  /** Accessible label; also shown as a tooltip. */
  title?: string
}

interface Props extends ArtBaseProps {
  width: number
  height: number
  viewBox: string
  children: ReactNode
}

/** The outer <svg> of an art piece. Nestable: x / y place it inside a parent SVG. */
export function ArtSvg({ width, height, viewBox, x, y, className, style, title, children }: Props) {
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={viewBox}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      overflow="visible"
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  )
}
