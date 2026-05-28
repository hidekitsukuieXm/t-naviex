/**
 * SMTPクライアント
 *
 * nodemailerを使用したメール送信機能を提供
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { SmtpSettings, SmtpTestResult } from '@/types/smtp-settings';

/**
 * SMTPクライアント設定
 */
export interface SmtpClientConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: {
    email: string;
    name?: string;
  };
}

/**
 * メール送信オプション
 */
export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * メール送信結果
 */
export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMTPクライアントクラス
 */
export class SmtpClient {
  private config: SmtpClientConfig;
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

  constructor(config: SmtpClientConfig) {
    this.config = config;
  }

  /**
   * SmtpSettingsからSMTPクライアントを作成
   */
  static fromSettings(settings: SmtpSettings, decryptedPassword?: string): SmtpClient {
    const config: SmtpClientConfig = {
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      from: {
        email: settings.fromEmail,
        name: settings.fromName || undefined,
      },
    };

    if (settings.authEnabled && settings.username && decryptedPassword) {
      config.auth = {
        user: settings.username,
        pass: decryptedPassword,
      };
    }

    return new SmtpClient(config);
  }

  /**
   * トランスポーターを取得（遅延初期化）
   */
  private getTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 30000,
      });
    }
    return this.transporter;
  }

  /**
   * 送信元アドレスを取得
   */
  private getFromAddress(): string {
    if (this.config.from.name) {
      return `"${this.config.from.name}" <${this.config.from.email}>`;
    }
    return this.config.from.email;
  }

  /**
   * メールを送信
   */
  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    try {
      const transporter = this.getTransporter();

      const mailOptions: nodemailer.SendMailOptions = {
        from: this.getFromAddress(),
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (options.cc) {
        mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
      }

      if (options.bcc) {
        mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
      }

      if (options.replyTo) {
        mailOptions.replyTo = options.replyTo;
      }

      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        }));
      }

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<SmtpTestResult> {
    const startTime = Date.now();

    try {
      const transporter = this.getTransporter();
      await transporter.verify();

      const connectionTime = Date.now() - startTime;

      return {
        success: true,
        message: 'SMTP接続テストに成功しました。',
        details: {
          connectionTime,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        message: `SMTP接続テストに失敗しました: ${errorMessage}`,
      };
    }
  }

  /**
   * テストメールを送信
   */
  async sendTestMail(toEmail: string): Promise<SendMailResult> {
    const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    return this.sendMail({
      to: toEmail,
      subject: '【T-NaviEx】SMTP設定テストメール',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h1 style="color: #3B82F6;">SMTP設定テスト</h1>
  <p>このメールはT-NaviExのSMTP設定テストとして送信されました。</p>
  <p>このメールが正常に届いていれば、SMTP設定は正しく構成されています。</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
  <p style="font-size: 12px; color: #6b7280;">
    送信日時: ${now}<br>
    送信元: ${this.getFromAddress()}
  </p>
</body>
</html>
      `,
      text: `SMTP設定テスト

このメールはT-NaviExのSMTP設定テストとして送信されました。
このメールが正常に届いていれば、SMTP設定は正しく構成されています。

送信日時: ${now}
送信元: ${this.getFromAddress()}
      `,
    });
  }

  /**
   * トランスポーターを閉じる
   */
  close(): void {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}

// シングルトンインスタンス（設定が変更されたら再作成）
let smtpClientInstance: SmtpClient | null = null;

/**
 * SMTPクライアントを初期化
 */
export function initializeSmtpClient(config: SmtpClientConfig): SmtpClient {
  if (smtpClientInstance) {
    smtpClientInstance.close();
  }
  smtpClientInstance = new SmtpClient(config);
  return smtpClientInstance;
}

/**
 * SMTPクライアントを取得
 */
export function getSmtpClient(): SmtpClient | null {
  return smtpClientInstance;
}

/**
 * SMTPクライアントをリセット
 */
export function resetSmtpClient(): void {
  if (smtpClientInstance) {
    smtpClientInstance.close();
    smtpClientInstance = null;
  }
}
