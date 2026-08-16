/**
 * A search-volume data source. The pipeline is source-agnostic: swapping
 * providers (mock → DataForSEO → Google Ads Keyword Planner → ...) means
 * writing one adapter, nothing else changes.
 */
export interface VolumeSource {
  /** Recorded on every snapshot for provenance. */
  name: string;
  /**
   * Fetch monthly volumes for a batch of query terms.
   * Returns a map of term -> volume. A missing key means the source had
   * no data for that term; the pipeline flags it rather than guessing.
   */
  fetchVolumes(terms: string[]): Promise<Map<string, number>>;
}
