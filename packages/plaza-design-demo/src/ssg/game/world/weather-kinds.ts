export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog' | 'smog' | 'heat';
export const WEATHER_KINDS: WeatherKind[] = ['clear', 'cloudy', 'rain', 'storm', 'fog', 'smog', 'heat'];
export const isWeather = (s: string): s is WeatherKind => (WEATHER_KINDS as string[]).includes(s);
export interface ClimateDef {name:string;seed:number;weights:Partial<Record<WeatherKind,number>>;roof?:string;fixed?:WeatherKind;note?:string}
