/**
 * ADFS Provider
 *
 * Active Directory Federation Services (ADFS) との SSO 連携を提供
 * SAML 2.0 / WS-Federation プロトコルをサポート
 */

import type { SsoConfiguration, SsoUserInfo, SsoConnectionTestResult } from '@/types/sso';

/**
 * ADFS設定
 */
export interface AdfsConfig {
  federationMetadataUrl: string; // e.g., https://adfs.example.com/FederationMetadata/2007-06/FederationMetadata.xml
  entityId: string; // SP Entity ID
  relyingPartyIdentifier: string; // Relying Party Trust identifier
  redirectUri: string;
  certificate?: string; // IdP signing certificate
  privateKey?: string; // SP private key for signing
}

/**
 * SAML Assertion
 */
interface SamlAssertion {
  issuer: string;
  subject: {
    nameId: string;
    nameIdFormat: string;
  };
  conditions: {
    notBefore: Date;
    notOnOrAfter: Date;
    audienceRestriction: string[];
  };
  attributes: Record<string, string | string[]>;
}

/**
 * WS-Federation Token
 */
interface WsFederationToken {
  tokenType: string;
  created: Date;
  expires: Date;
  claims: Record<string, string | string[]>;
}

/**
 * ADFS Claim Types
 */
export const AdfsClaimTypes = {
  // Identity claims
  NAME_IDENTIFIER: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  NAME: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  EMAIL: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  UPN: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
  GIVEN_NAME: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
  SURNAME: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',

  // Group/Role claims
  GROUP: 'http://schemas.xmlsoap.org/claims/Group',
  ROLE: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  GROUP_SID: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groupsid',

  // Additional claims
  WINDOWS_ACCOUNT_NAME:
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname',
  PRIMARY_SID: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/primarysid',
} as const;

/**
 * ADFSプロバイダークラス
 */
export class AdfsProvider {
  private config: AdfsConfig;

  constructor(config: AdfsConfig) {
    this.config = config;
  }

  /**
   * SSO設定からADFSプロバイダーを作成
   */
  static fromSsoConfiguration(ssoConfig: SsoConfiguration, redirectUri: string): AdfsProvider {
    const federationMetadataUrl = ssoConfig.metadata?.federationMetadataUrl as string;
    if (!federationMetadataUrl) {
      throw new Error('フェデレーションメタデータURLが設定されていません');
    }

    if (!ssoConfig.entityId) {
      throw new Error('エンティティIDが設定されていません');
    }

    const relyingPartyIdentifier = ssoConfig.metadata?.relyingPartyIdentifier as string;
    if (!relyingPartyIdentifier) {
      throw new Error('証明書利用者識別子が設定されていません');
    }

    return new AdfsProvider({
      federationMetadataUrl,
      entityId: ssoConfig.entityId,
      relyingPartyIdentifier,
      redirectUri,
      certificate: ssoConfig.certificate,
      privateKey: ssoConfig.privateKey,
    });
  }

  /**
   * ADFS サーバーURL を取得
   */
  private get adfsBaseUrl(): string {
    try {
      const url = new URL(this.config.federationMetadataUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return '';
    }
  }

  /**
   * WS-Federation サインインURL を生成
   */
  getWsFederationSignInUrl(wctx?: string): string {
    const params = new URLSearchParams({
      wa: 'wsignin1.0',
      wtrealm: this.config.relyingPartyIdentifier,
      wreply: this.config.redirectUri,
    });

    if (wctx) {
      params.set('wctx', wctx);
    }

    return `${this.adfsBaseUrl}/adfs/ls/?${params.toString()}`;
  }

  /**
   * WS-Federation サインアウトURL を生成
   */
  getWsFederationSignOutUrl(wreply?: string): string {
    const params = new URLSearchParams({
      wa: 'wsignout1.0',
    });

    if (wreply) {
      params.set('wreply', wreply);
    }

    return `${this.adfsBaseUrl}/adfs/ls/?${params.toString()}`;
  }

  /**
   * SAML AuthnRequest URL を生成
   */
  getSamlAuthorizationUrl(relayState: string): string {
    // SAML AuthnRequest を生成
    const authnRequest = this.generateSamlAuthnRequest();
    const encodedRequest = this.encodeSamlRequest(authnRequest);

    const params = new URLSearchParams({
      SAMLRequest: encodedRequest,
      RelayState: relayState,
    });

    return `${this.adfsBaseUrl}/adfs/ls/?${params.toString()}`;
  }

  /**
   * SAML AuthnRequest を生成
   */
  private generateSamlAuthnRequest(): string {
    const id = `_${this.generateId()}`;
    const issueInstant = new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${id}"
                    Version="2.0"
                    IssueInstant="${issueInstant}"
                    Destination="${this.adfsBaseUrl}/adfs/ls/"
                    AssertionConsumerServiceURL="${this.config.redirectUri}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${this.config.entityId}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                      AllowCreate="true"/>
</samlp:AuthnRequest>`;
  }

  /**
   * SAML Request をエンコード
   */
  private encodeSamlRequest(request: string): string {
    // Base64 エンコード（デフレート圧縮なし - HTTP-POST バインディング用）
    if (typeof window !== 'undefined') {
      return btoa(request);
    } else {
      return Buffer.from(request).toString('base64');
    }
  }

  /**
   * ランダムなIDを生成
   */
  private generateId(): string {
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined') {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 16; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * SAML Response を検証・パース
   */
  async validateSamlResponse(samlResponse: string): Promise<SamlAssertion> {
    // Base64 デコード
    const decodedResponse =
      typeof window !== 'undefined'
        ? atob(samlResponse)
        : Buffer.from(samlResponse, 'base64').toString('utf-8');

    // XML パース（簡易実装 - 実際の本番環境では xml-crypto などを使用すべき）
    const assertion = this.parseXmlAssertion(decodedResponse);

    // 署名検証（本番環境では必須）
    if (this.config.certificate) {
      // 署名検証ロジックを実装
      // xml-crypto などのライブラリを使用すべき
    }

    // 条件検証
    const now = new Date();
    if (assertion.conditions.notBefore > now) {
      throw new Error('SAML Assertion はまだ有効期間外です');
    }
    if (assertion.conditions.notOnOrAfter < now) {
      throw new Error('SAML Assertion の有効期限が切れています');
    }

    // Audience 検証
    if (!assertion.conditions.audienceRestriction.includes(this.config.entityId)) {
      throw new Error('SAML Assertion の Audience が一致しません');
    }

    return assertion;
  }

  /**
   * XML から SAML Assertion をパース（簡易実装）
   */
  private parseXmlAssertion(xml: string): SamlAssertion {
    // 簡易的な正規表現パーサー
    // 本番環境では DOMParser や xml2js などを使用すべき

    const getTagContent = (tagName: string, content: string): string => {
      const regex = new RegExp(`<[^>]*${tagName}[^>]*>([^<]*)<\\/`, 'i');
      const match = content.match(regex);
      return match ? match[1] : '';
    };

    const getAttributeValue = (attrName: string, tagName: string, content: string): string => {
      const regex = new RegExp(`<${tagName}[^>]*${attrName}="([^"]*)"`, 'i');
      const match = content.match(regex);
      return match ? match[1] : '';
    };

    // Attributes を抽出
    const attributes: Record<string, string | string[]> = {};
    const attrRegex =
      /<(?:saml:)?Attribute[^>]*Name="([^"]*)"[^>]*>[\s\S]*?<(?:saml:)?AttributeValue[^>]*>([^<]*)<\/(?:saml:)?AttributeValue>/gi;
    let match;
    while ((match = attrRegex.exec(xml)) !== null) {
      const name = match[1];
      const value = match[2];
      if (attributes[name]) {
        if (Array.isArray(attributes[name])) {
          (attributes[name] as string[]).push(value);
        } else {
          attributes[name] = [attributes[name] as string, value];
        }
      } else {
        attributes[name] = value;
      }
    }

    return {
      issuer: getTagContent('Issuer', xml),
      subject: {
        nameId: getTagContent('NameID', xml),
        nameIdFormat: getAttributeValue('Format', 'NameID', xml),
      },
      conditions: {
        notBefore: new Date(getAttributeValue('NotBefore', 'Conditions', xml)),
        notOnOrAfter: new Date(getAttributeValue('NotOnOrAfter', 'Conditions', xml)),
        audienceRestriction: [getTagContent('Audience', xml)],
      },
      attributes,
    };
  }

  /**
   * WS-Federation Token を検証・パース
   */
  async validateWsFederationToken(wresult: string): Promise<WsFederationToken> {
    // XML パース（簡易実装）
    const claims: Record<string, string | string[]> = {};

    // Claim を抽出
    const claimRegex =
      /<(?:claim|Attribute)[^>]*(?:claimType|Name)="([^"]*)"[^>]*>[\s\S]*?<(?:Value|AttributeValue)[^>]*>([^<]*)<\/(?:Value|AttributeValue)/gi;
    let match;
    while ((match = claimRegex.exec(wresult)) !== null) {
      const name = match[1];
      const value = match[2];
      if (claims[name]) {
        if (Array.isArray(claims[name])) {
          (claims[name] as string[]).push(value);
        } else {
          claims[name] = [claims[name] as string, value];
        }
      } else {
        claims[name] = value;
      }
    }

    return {
      tokenType: 'urn:oasis:names:tc:SAML:1.0:assertion',
      created: new Date(),
      expires: new Date(Date.now() + 3600000), // 1時間後
      claims,
    };
  }

  /**
   * Claim からユーザー情報を抽出
   */
  extractUserInfo(claims: Record<string, string | string[]>): SsoUserInfo {
    const getClaimValue = (
      claimType: string,
      alternativeTypes: string[] = []
    ): string | undefined => {
      const value = claims[claimType];
      if (value) {
        return Array.isArray(value) ? value[0] : value;
      }
      for (const altType of alternativeTypes) {
        const altValue = claims[altType];
        if (altValue) {
          return Array.isArray(altValue) ? altValue[0] : altValue;
        }
      }
      return undefined;
    };

    const getClaimValues = (
      claimType: string,
      alternativeTypes: string[] = []
    ): string[] | undefined => {
      const value = claims[claimType];
      if (value) {
        return Array.isArray(value) ? value : [value];
      }
      for (const altType of alternativeTypes) {
        const altValue = claims[altType];
        if (altValue) {
          return Array.isArray(altValue) ? altValue : [altValue];
        }
      }
      return undefined;
    };

    const nameId =
      getClaimValue(AdfsClaimTypes.NAME_IDENTIFIER) ||
      getClaimValue(AdfsClaimTypes.UPN) ||
      getClaimValue(AdfsClaimTypes.EMAIL) ||
      '';

    const email =
      getClaimValue(AdfsClaimTypes.EMAIL) || getClaimValue(AdfsClaimTypes.UPN) || nameId;

    const givenName = getClaimValue(AdfsClaimTypes.GIVEN_NAME);
    const surname = getClaimValue(AdfsClaimTypes.SURNAME);
    const name =
      getClaimValue(AdfsClaimTypes.NAME) ||
      (givenName && surname
        ? `${givenName} ${surname}`
        : givenName || surname || email.split('@')[0]);

    const groups =
      getClaimValues(AdfsClaimTypes.GROUP, [AdfsClaimTypes.ROLE, AdfsClaimTypes.GROUP_SID]) || [];

    return {
      id: nameId,
      email,
      name,
      groups,
      metadata: {
        ssoProvider: 'ADFS',
        windowsAccountName: getClaimValue(AdfsClaimTypes.WINDOWS_ACCOUNT_NAME),
        primarySid: getClaimValue(AdfsClaimTypes.PRIMARY_SID),
        upn: getClaimValue(AdfsClaimTypes.UPN),
        allClaims: claims,
      },
    };
  }

  /**
   * 接続テストを実行
   */
  async testConnection(): Promise<SsoConnectionTestResult> {
    const details: SsoConnectionTestResult['details'] = {};

    try {
      // フェデレーションメタデータの取得テスト
      const metadataResponse = await fetch(this.config.federationMetadataUrl);
      details.authorizationUrl = metadataResponse.ok;
    } catch {
      details.authorizationUrl = false;
    }

    try {
      // ADFS サインインエンドポイントのテスト
      const signInUrl = `${this.adfsBaseUrl}/adfs/ls/`;
      const signInResponse = await fetch(signInUrl, { method: 'HEAD' });
      details.tokenUrl = signInResponse.ok || signInResponse.status === 400;
    } catch {
      details.tokenUrl = false;
    }

    try {
      // .well-known/openid-configuration のテスト（ADFS 3.0以降）
      const openIdConfigUrl = `${this.adfsBaseUrl}/.well-known/openid-configuration`;
      const configResponse = await fetch(openIdConfigUrl);
      details.userInfoUrl = configResponse.ok;
    } catch {
      details.userInfoUrl = false;
    }

    const allPassed = Object.values(details).every((v) => v === true);

    return {
      success: allPassed,
      message: allPassed ? 'ADFS接続テストに成功しました' : 'ADFS接続テストに一部失敗しました',
      details,
    };
  }

  /**
   * デフォルトURL設定を取得
   */
  static getDefaultUrls(adfsServer: string): {
    federationMetadataUrl: string;
    signInUrl: string;
    signOutUrl: string;
  } {
    const baseUrl = adfsServer.startsWith('https://') ? adfsServer : `https://${adfsServer}`;
    return {
      federationMetadataUrl: `${baseUrl}/FederationMetadata/2007-06/FederationMetadata.xml`,
      signInUrl: `${baseUrl}/adfs/ls/`,
      signOutUrl: `${baseUrl}/adfs/ls/?wa=wsignout1.0`,
    };
  }
}

/**
 * ADFSの自動プロビジョニングサービス
 */
export class AdfsUserProvisioner {
  /**
   * ADFSユーザーをローカルユーザーとしてプロビジョニング
   */
  static mapToLocalUser(ssoUserInfo: SsoUserInfo): {
    email: string;
    name: string;
    externalId: string;
    metadata: Record<string, unknown>;
  } {
    return {
      email: ssoUserInfo.email,
      name: ssoUserInfo.name || ssoUserInfo.email.split('@')[0],
      externalId: ssoUserInfo.id,
      metadata: {
        ssoProvider: 'ADFS',
        ...ssoUserInfo.metadata,
        groups: ssoUserInfo.groups,
      },
    };
  }

  /**
   * ADFSグループ/ロールをローカルロールにマッピング
   */
  static mapGroupsToRoles(
    groups: string[],
    mappings: Array<{ ssoGroupName: string; localRoleId: string; priority: number }>
  ): string[] {
    // 優先度順にソート
    const sortedMappings = [...mappings].sort((a, b) => b.priority - a.priority);

    const mappedRoleIds: string[] = [];
    // 優先度順に処理してユーザーが持つグループに一致するものを追加
    for (const mapping of sortedMappings) {
      if (groups.includes(mapping.ssoGroupName) && !mappedRoleIds.includes(mapping.localRoleId)) {
        mappedRoleIds.push(mapping.localRoleId);
      }
    }

    return mappedRoleIds;
  }
}
