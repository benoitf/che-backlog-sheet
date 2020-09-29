import axios from 'axios';
import * as semver from 'semver';

export class TheiaVersionFetcher {
  public static readonly THEIA_CORE_PACKAGE_JSON = 'https://raw.githubusercontent.com/eclipse-theia/theia/master/packages/core/package.json';

  private version: Promise<string | undefined> | undefined;

   async init(): Promise<string | undefined> {
    // first, get theia latest version

    const response = await axios.get(TheiaVersionFetcher.THEIA_CORE_PACKAGE_JSON);
    const data = response.data;
    this.version = data.version;
    return this.version;
  }

  public async getVersion(): Promise<string | undefined> {
    if (!this.version) {
      this.version = this.init();
    }

    return this.version;
  }


  public async getCurrentSprint(): Promise<string | undefined> {
    const version = await this.getVersion();
    if (version) {
      const cheMilestoneSemver = semver.coerce(version);
      if (cheMilestoneSemver) {
        return `${cheMilestoneSemver.major}.${cheMilestoneSemver.minor + 1}.${cheMilestoneSemver.patch}`;
      }
    }
    return version;
  }

  public async getNextSprint(): Promise<string | undefined> {
    const version = await this.getVersion();
    if (version) {
      const cheMilestoneSemver = semver.coerce(version);
      if (cheMilestoneSemver) {
        return `${cheMilestoneSemver.major}.${cheMilestoneSemver.minor + 2}.${cheMilestoneSemver.patch}`;
      }
    }
    return version;
  }

  public async getPreviousSprint(): Promise<string | undefined> {
    const version = await this.getVersion();
    if (version) {
      const cheMilestoneSemver = semver.coerce(version);
      if (cheMilestoneSemver) {
        return `${cheMilestoneSemver.major}.${cheMilestoneSemver.minor}.${cheMilestoneSemver.patch}`;
      }
    }
    return version;
  }

}
