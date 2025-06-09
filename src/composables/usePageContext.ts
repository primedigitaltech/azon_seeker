export const usePageContext = () => {
  const pageContext = document.location.pathname.split('/')[2] as 'sidepanel' | 'options';
  return { pageContext };
};
