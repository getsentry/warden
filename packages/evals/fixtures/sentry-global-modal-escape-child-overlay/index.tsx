// Source excerpt from getsentry/sentry static/app/components/globalModal/index.tsx@acd049bee68e463e7d7af339ccdc721ad8654da5.
// Unrelated context omitted; captured around the fix diff for 98349bd88adc847b39d2a758c89c36770ad49815.


/**
 * Meta-type to make re-exporting these in the action creator easy without
 * polluting the global API namespace with duplicate type names.
 *
 * eg. you won't accidentally import ModalRenderProps from here.
 */
export type ModalTypes = {
  options: ModalOptions;
  renderProps: ModalRenderProps;
};

type Props = {
  /**
   * Note this is the callback for the main App container and NOT the calling
   * component. GlobalModal is never used directly, but is controlled via
   * stores. To access the onClose callback from the component, you must
   * specify it when using the action creator.
   */
  onClose?: () => void;
};

function GlobalModal({onClose}: Props) {
  const {renderer, options, visible} = useGlobalModal();
  const location = useLocation();

  const closeEvents = options.closeEvents ?? 'all';

  const closeModal = useCallback(
    (reason?: 'close-button' | 'backdrop-click' | 'escape-key') => {
      // Option close callback, from the thing which opened the modal
      options.onClose?.(reason);

      // actually closes the modal
      ModalStore.closeModal();

      // GlobalModal onClose prop callback
      onClose?.();
    },
    [options, onClose]
  );

  const handleEscapeClose = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.key !== 'Escape' ||
        closeEvents === 'none' ||
        closeEvents === 'backdrop-click'
      ) {
        return;
      }

      closeModal('escape-key');
    },
    [closeModal, closeEvents]
  );

  const scrollLock = useScrollLock(document.documentElement);
  const portal = getModalPortal();
  const focusTrap = useRef<FocusTrap | null>(null);
  // SentryApp might be missing on tests
  if (window.SentryApp) {
    window.SentryApp.modalFocusTrap = focusTrap;
  }

  useEffect(() => {
    focusTrap.current = createFocusTrap(portal, {
      preventScroll: true,
      escapeDeactivates: false,
      fallbackFocus: portal,
      allowOutsideClick: true,
    });
    ModalStore.setFocusTrap(focusTrap.current);
  }, [portal]);

  useEffect(() => {
    const root = document.getElementById(ROOT_ELEMENT);

    const reset = () => {
      scrollLock.release();
      root?.removeAttribute('aria-hidden');
      focusTrap.current?.deactivate();
      document.removeEventListener('keydown', handleEscapeClose);
    };

    if (visible) {
      scrollLock.acquire();
      root?.setAttribute('aria-hidden', 'true');
      focusTrap.current?.activate();

      document.addEventListener('keydown', handleEscapeClose);