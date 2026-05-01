import API from '../api';

describe('API Service Unit Tests', () => {
  let api: API;

  beforeEach(() => {
    api = new API();
  });

  it('defines all required resource methods', () => {
    expect(api.getCapsules).toBeDefined();
    expect(api.getShips).toBeDefined();
    expect(api.getLaunches).toBeDefined();
    expect(api.getRockets).toBeDefined();
  });

  it('implements getLaunch with an ID argument', () => {
    const spy = jest.spyOn(api as any, 'get').mockResolvedValue({});
    api.getLaunch('101');
    expect(spy).toHaveBeenCalledWith('launches/101', 5);
  });
});