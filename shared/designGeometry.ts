import type { TemplateSize } from './types';

/** صندوق نسبي مستقل عن بكسلات التصدير، بإحداثيات من 0 إلى 1. */
export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesignGeometry {
  safe: NormalizedBox;
  header: NormalizedBox;
  logo: NormalizedBox;
  hero: NormalizedBox;
  info: NormalizedBox;
  price: NormalizedBox;
  features: NormalizedBox;
  footer: NormalizedBox;
  badge: NormalizedBox;
}

const clone = (box: NormalizedBox): NormalizedBox => ({ ...box });

/**
 * المصدر الحتمي لمناطق قالب الإعلان. يبقى محرك Canvas مسؤولاً عن الرسم فقط،
 * بينما يستطيع عقد التصميم والاختبارات استعمال المناطق نفسها بلا تحليل صورة.
 */
export function getDesignGeometry(size: TemplateSize): DesignGeometry {
  if (size === 'landscape') {
    return {
      safe: { x: .035, y: .06, width: .93, height: .88 },
      header: { x: .20, y: .10, width: .34, height: .20 },
      logo: { x: .55, y: .10, width: .09, height: .17 },
      hero: { x: .07, y: .30, width: .48, height: .30 },
      info: { x: .61, y: .42, width: .14, height: .18 },
      price: { x: .79, y: .38, width: .15, height: .22 },
      features: { x: .60, y: .18, width: .34, height: .10 },
      footer: { x: 0, y: .627, width: 1, height: .351 },
      badge: { x: .06, y: .10, width: .11, height: .16 },
    };
  }

  const config: Record<Exclude<TemplateSize, 'landscape'>, { headerY: number; headerH: number; heroY: number; heroH: number; infoY: number; featureY: number; footerY: number; footerH: number }> = {
    portrait: { headerY: .06, headerH: .13, heroY: .20, heroH: .52, infoY: .42, featureY: .75, footerY: .83, footerH: .147 },
    square: { headerY: .06, headerH: .15, heroY: .22, heroH: .48, infoY: .43, featureY: .73, footerY: .793, footerH: .184 },
    story: { headerY: .055, headerH: .10, heroY: .17, heroH: .58, infoY: .44, featureY: .78, footerY: .872, footerH: .103 },
    whatsapp: { headerY: .06, headerH: .12, heroY: .19, heroH: .55, infoY: .43, featureY: .77, footerY: .84, footerH: .138 },
  };
  const current = config[size];
  return {
    safe: { x: .04, y: .025, width: .92, height: .95 },
    header: { x: .14, y: current.headerY, width: .72, height: current.headerH },
    logo: { x: .77, y: current.headerY + current.headerH * .08, width: .095, height: current.headerH * .58 },
    hero: { x: .17, y: current.heroY, width: .66, height: current.heroH },
    info: { x: .055, y: current.infoY, width: .13, height: .20 },
    price: { x: .815, y: current.infoY, width: .13, height: .20 },
    features: { x: .14, y: current.featureY, width: .72, height: .06 },
    footer: { x: 0, y: current.footerY, width: 1, height: current.footerH },
    badge: { x: .075, y: current.headerY + .01, width: .12, height: .10 },
  };
}

export function cloneDesignGeometry(size: TemplateSize): DesignGeometry {
  const geometry = getDesignGeometry(size);
  return {
    safe: clone(geometry.safe), header: clone(geometry.header), logo: clone(geometry.logo), hero: clone(geometry.hero),
    info: clone(geometry.info), price: clone(geometry.price), features: clone(geometry.features), footer: clone(geometry.footer), badge: clone(geometry.badge),
  };
}
