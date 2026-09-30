export const SEROPEDICA = {
  name: "Município de Seropédica",
  governmentName: "Prefeitura Municipal de Seropédica",
  slug: "seropedica-rj",
  state: "RJ",
  ibgeCode: "3305554",
  postalCodeRange: "23890-001 a 23899-899",
  cityCenter: { latitude: "-22.743889", longitude: "-43.707500" },
} as const;

export const SEROPEDICA_NEIGHBORHOODS = [
  { name: "Área Rural de Seropédica", postalCodeRange: "23899-899" },
  { name: "Boa Esperança", postalCodeRange: "23894-000 a 23894-890" },
  { name: "Cabral", postalCodeRange: "23893-460 a 23893-490" },
  { name: "Campo Lindo", postalCodeRange: "23898-000 a 23898-460" },
  { name: "Canto do Rio", postalCodeRange: "23899-000 a 23899-075" },
  { name: "Carretão", postalCodeRange: "23893-000 a 23893-010" },
  { name: "Chaperó", postalCodeRange: "23896-510 a 23896-884" },
  { name: "Ecologia", postalCodeRange: "23891-000 a 23891-490" },
  { name: "Fazenda Caxias", postalCodeRange: "23895-000 a 23895-971" },
  { name: "Incra", postalCodeRange: "23890-360 a 23890-680" },
  { name: "Jardim Maracanã", postalCodeRange: "23891-630 a 23891-840" },
  { name: "Jardins", postalCodeRange: "23890-001 a 23890-154" },
  { name: "Nazaré", postalCodeRange: "23892-500 a 23892-770" },
  { name: "Parque Jacimar", postalCodeRange: "23897-420 a 23897-690" },
  { name: "Piranema", postalCodeRange: "23898-500 a 23898-896" },
  { name: "Santa Alice", postalCodeRange: "23892-050 a 23892-490" },
  { name: "Santa Sofia", postalCodeRange: "23895-500 a 23895-845" },
  { name: "São Miguel", postalCodeRange: "23893-690 a 23893-890" },
  { name: "UFRRJ", postalCodeRange: "23897-000 a 23897-970" },
] as const;

export const SEROPEDICA_NEIGHBORHOOD_NAMES = SEROPEDICA_NEIGHBORHOODS.map((item) => item.name);
