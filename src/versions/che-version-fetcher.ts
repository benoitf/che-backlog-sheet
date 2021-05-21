import axios from 'axios';
import * as semver from 'semver';

export class CheVersionFetcher {
  public static readonly CHE_POM_XML = 'https://raw.githubusercontent.com/eclipse-che/che-server/HEAD/pom.xml';

  private version: Promise<string | undefined> | undefined;

   async init(): Promise<string | undefined> {
    // first, get che latest version
    const grabCheVersion = /<artifactId>che-server<\/artifactId>[^]*<version>(\d+\.\d+\.\d(?:-.*\d)*)(?:-SNAPSHOT)?<\/version>[^]*<packaging>/gm;
    
    const response = await axios.get(CheVersionFetcher.CHE_POM_XML);
    const data = response.data;

    const parsedVersion = grabCheVersion.exec(data);
    if (parsedVersion) {
      return parsedVersion[1];
    } else {
      return undefined;
    }
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
        return `${cheMilestoneSemver.major}.${cheMilestoneSemver.minor}`;
      }
    }
    return version;
  }

  public async getNextSprint(): Promise<string | undefined> {
    const version = await this.getVersion();
    if (version) {
      const cheMilestoneSemver = semver.coerce(version);
      if (cheMilestoneSemver) {
        return `${cheMilestoneSemver.major}.${cheMilestoneSemver.minor + 1}`;
      }
    }
    return version;
  }

  public async getPreviousSprint(): Promise<string | undefined> {
    const version = await this.getVersion();
    if (version) {
      const cheMilestoneSemver = semver.coerce(version);
      if (cheMilestoneSemver) {
        return `${cheMilestoneSemver.major}.${cheMilestoneSemver.minor - 1}`;
      }
    }
    return version;
  }

}
