
export class Notifier {
  private robot: Hubot.Robot<void>;

  constructor(robot: Hubot.Robot<void>) {
    this.robot = robot;
  }

  public notify(...args: any[]): void {
    (this.robot as any).messageRoom("chebot-actions", "" + args);
  }

  public publishContent(...args: any[]): void {
    (this.robot as any).messageRoom("chebot-actions", "" + args);
  }

  public error(...args: any[]): void {
    (this.robot as any).messageRoom("chebot-actions", "error:" + args);
  }

  public displayReport(report: string): void {
    (this.robot as any).messageRoom("triage-test", report);
  }

}
