export function onSettledResize(
  target: EventTarget,
  callback: () => void,
  delay = 120,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const resized = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      callback();
    }, delay);
  };
  target.addEventListener("resize", resized);
  return () => {
    clearTimeout(timer);
    target.removeEventListener("resize", resized);
  };
}
