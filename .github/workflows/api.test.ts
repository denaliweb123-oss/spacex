import API from '../../../api';

describe('API Service Unit Tests', () => {
  let api: API;

  beforeEach(() => {
    api = new API();
    // Mocking the get method inherited from RESTDataSource if necessary
    // For now we test the presence of resource methods
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
    expect(spy).toHaveBeenCalledWith('launches/101');
  });

  it('implements getShips as a list fetcher', () => {
    const spy = jest.spyOn(api as any, 'get').mockResolvedValue([]);
    api.getShips();
    expect(spy).toHaveBeenCalledWith('ships');
  });
});