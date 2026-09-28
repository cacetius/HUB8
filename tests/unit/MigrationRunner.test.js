const { splitStatements } = require('../../backend/scripts/run-migrations');

describe('runner de migrations', () => {
  it('separa comandos SQL e ignora linhas de comentário', () => {
    expect(splitStatements('-- comentário\nCREATE TABLE USERS (ID INT);\nINSERT INTO USERS VALUES (1);'))
      .toEqual(['CREATE TABLE USERS (ID INT)', 'INSERT INTO USERS VALUES (1)']);
  });
});
