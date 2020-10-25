import { nextTick, reactive, toRefs } from 'vue';
import { Config } from './config';
// P mean params, R mean Response
export type Request<P extends any[], R> = (...args: P) => Promise<R>;
type MutateData<R> = (newData: R) => void;
type MutateFunction<R> = (arg: (oldData: R) => R) => void;
export interface Mutate<R> extends MutateData<R>, MutateFunction<R> {}

export type QueryState<P extends any[], R> = {
  loading: boolean;
  data: R | undefined;
  error: Error | undefined;
  params: P;
  run: (...arg: P) => Promise<R>;
  cancel: () => void;
  refresh: () => Promise<R>;
  mutate: Mutate<R>;
};

const createQuery = <P extends any[], R>(
  request: Request<P, R>,
  config: Config<P>,
): QueryState<P, R> => {
  const state = reactive({
    loading: false,
    data: undefined,
    error: undefined,
    params: ([] as unknown) as P,
  }) as Partial<QueryState<P, R>>;

  const setState = (newState: typeof state, cb?: () => void) => {
    Object.keys(newState).forEach(key => {
      // @ts-ignore
      state[key] = newState[key];
    });
    nextTick(() => {
      cb?.();
    });
  };

  const _run = (...args: P) => {
    state.loading = true;
    setState({
      loading: true,
      params: args,
    });
    return request(...args)
      .then(res => {
        setState({
          data: res,
          loading: false,
          error: undefined,
        });
        return res;
      })
      .catch(error => {
        setState({
          data: undefined,
          loading: false,
          error: error,
        });
        console.log(error);
        return Promise.reject('已处理的错误');
      })
      .finally(() => {
        console.log('1');
      });
  };

  const run = (...args: P) => {
    return _run(...args);
  };

  const cancel = () => {
    return;
  };

  const refresh = () => {
    return run(...state.params!);
  };

  const mutate: Mutate<R> = (
    x: Parameters<MutateData<R>>[0] | Parameters<MutateFunction<R>>[0],
  ) => {
    if (x instanceof Function) {
      state.data = x(state.data!);
    } else {
      state.data = x;
    }
  };

  const reactiveState = reactive({
    ...toRefs(state),
    run,
    cancel,
    refresh,
    mutate,
  }) as QueryState<P, R>;

  return reactiveState;
};

export default createQuery;
