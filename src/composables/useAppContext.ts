export function useAppContext() {
  const appContext = document.location.pathname.split('/')[2] as AppContext;
  return { appContext };
}
