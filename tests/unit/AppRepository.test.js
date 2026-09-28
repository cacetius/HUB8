const { AppRepository } = require('../../backend/src/repositories/AppRepository');

describe('AppRepository', () => {
  it('usa o ID retornado pelo adapter ao criar um app', async () => {
    const db = {
      insert: jest.fn().mockResolvedValue({ insertId: 23 }),
    };
    const repository = new AppRepository(db);

    await expect(repository.create({ name: 'VCP', url: '/vcp' }, 4)).resolves.toBe(23);
    expect(db.insert).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO APPS'),
      expect.arrayContaining(['VCP', '/vcp', 4])
    );
  });
});
