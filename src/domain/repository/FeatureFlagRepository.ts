export type FeatureFlag = {
  barbershopId: string;
  module: string;
  enabled: boolean;
  source: string;
};

export interface IFeatureFlagRepository {
  findEnabledByBarbershop(barbershopId: string): Promise<string[]>;
  upsert(
    barbershopId: string,
    module: string,
    enabled: boolean,
    source?: string,
  ): Promise<FeatureFlag>;
}
