import { Provider } from 'react-redux';

export function StoreProvider({ store, children }) {
  return <Provider store={store}>{children}</Provider>;
}
