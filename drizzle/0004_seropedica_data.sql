UPDATE "municipalities"
SET "name" = 'Município de Seropédica', "slug" = 'seropedica-rj', "updated_at" = now()
WHERE "id" = '00000000-0000-4000-8000-000000000001';

UPDATE "requests"
SET
  "latitude" = (-22.743889 + ((abs(hashtext("id"::text)) % 80) - 40)::numeric / 10000)::text,
  "longitude" = (-43.707500 + ((abs(hashtext("protocol")) % 80) - 40)::numeric / 10000)::text,
  "updated_at" = now()
WHERE "municipality_id" = '00000000-0000-4000-8000-000000000001'
  AND "latitude" IS NOT NULL
  AND "longitude" IS NOT NULL
  AND (
    "latitude"::numeric < -22.9 OR "latitude"::numeric > -22.6 OR
    "longitude"::numeric < -43.9 OR "longitude"::numeric > -43.5
  );

UPDATE "requests"
SET "neighborhood" = 'Fazenda Caxias', "postal_code" = coalesce("postal_code", '23895-295'), "updated_at" = now()
WHERE "municipality_id" = '00000000-0000-4000-8000-000000000001'
  AND "neighborhood" NOT IN (
    'Área Rural de Seropédica', 'Boa Esperança', 'Cabral', 'Campo Lindo', 'Canto do Rio',
    'Carretão', 'Chaperó', 'Ecologia', 'Fazenda Caxias', 'Incra', 'Jardim Maracanã',
    'Jardins', 'Nazaré', 'Parque Jacimar', 'Piranema', 'Santa Alice', 'Santa Sofia',
    'São Miguel', 'UFRRJ'
  );
