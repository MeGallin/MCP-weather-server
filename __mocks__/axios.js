// Manual mock for axios - ES module compatible
export const mockGet = jest.fn(() => Promise.resolve({ data: {} }));
export const mockPost = jest.fn(() => Promise.resolve({ data: {} }));
export const mockPut = jest.fn(() => Promise.resolve({ data: {} }));
export const mockDelete = jest.fn(() => Promise.resolve({ data: {} }));

const axios = {
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
  create: jest.fn().mockReturnValue({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  }),
  defaults: {
    headers: {},
  },
};

export default axios;
