import expect from 'expect';
import { Project, SourceFile } from 'ts-morph';

import { testSourceFile } from './helpers';
import { testGenerate } from './test-generate';

// Prisma 7 does not support MongoDB yet; skip these tests when on Prisma 7
const isPrisma7 = (() => {
  const v = (require('@prisma/generator-helper/package.json') as { version: string }).version;
  return Number.parseInt(v.split('.')[0], 10) >= 7;
})();
const describeMongo = isPrisma7 ? describe.skip : describe;

let project: Project;
let sourceFiles: SourceFile[];

describeMongo('type has been treated as model #99', () => {
  before(async () => {
    ({ project, sourceFiles } = await testGenerate({
      options: [
        // `outputFilePattern = "{name}.{type}.ts"`
      ],
      provider: 'mongodb',
      schema: `
                model User {
                  id String @id @default(auto()) @map("_id") @db.ObjectId
                  preferences Preference[]
                }
                type Preference {
                  name String
                  value String
                }
            `,
    }));
  });

  it('smoke', () => {
    expect(project).toBeTruthy();
  });

  it('files', () => {
    const files = project.getSourceFiles().map(s => s.getBaseName());
    expect(files.length).toBeGreaterThan(0);
  });

  it('user model', () => {
    const s = testSourceFile({
      file: 'user.model.ts',
      project,
      property: 'preferences',
    });
    expect(s.namedImports).toContainEqual({
      name: 'Preference',
      specifier: '../preference/preference.model',
    });
    expect(s.property?.type).toEqual('Array<Preference>');
    expect(s.fieldDecoratorType).toEqual('() => [Preference]');
  });
});

describeMongo('mongodb json', () => {
  before(async () => {
    ({ project, sourceFiles } = await testGenerate({
      options: [`outputFilePattern = "{name}.{type}.ts"`],
      provider: 'mongodb',
      schema: `
                model User {
                  id String @id @default(auto()) @map("_id") @db.ObjectId
                  json Json?
                }
            `,
    }));
  });

  it('smoke', () => {
    expect(project).toBeTruthy();
  });
});

describeMongo('single model and field mongodb', () => {
  before(async () => {
    ({ project, sourceFiles } = await testGenerate({
      options: [`outputFilePattern = "{name}.{type}.ts"`],
      provider: 'mongodb',
      schema: `
                model Product {
                  id String @id @default(auto()) @map("_id") @db.ObjectId
                }
            `,
    }));
  });

  it('example input update type', () => {
    const s = testSourceFile({
      file: 'update-one-product.args.ts',
      project,
    });
    // data field is missing because of single id field
    expect(s.classFile.getProperties()).toHaveLength(1);
  });
});
