export function clsx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(' ')
}
