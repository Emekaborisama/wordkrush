import { RibbonTitle } from './RibbonTitle';

export type RibbonProps = {
  /** "LEVEL 4 · BOXED IN" */
  label: string;
  /** Fill. Defaults to the kit's teal title tab. */
  color?: string;
  /** Kept so existing call sites compile; labels are white and outlined. */
  labelColor?: string;
};

/** Small level ribbon: the kit's teal title tab at its small size. */
export function Ribbon({ label, color }: RibbonProps) {
  return <RibbonTitle label={label} color={color} size="sm" />;
}
