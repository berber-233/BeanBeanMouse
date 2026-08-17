/* BeanBeanMouse 支付模块占位（框架）
 *
 * 合规前提：平台当前不处理真实资金。接入支付/托管/佣金前，必须先满足
 * docs/payments-compliance-roadmap.md 中的主体、牌照与风控要求。
 * 所有方法暂未实现，调用将明确报错，避免误接未合规通道。
 */

function notImplemented(name) {
  const err = new Error('PAYMENTS_NOT_IMPLEMENTED: ' + name + '（支付通道未接入，详见 docs/payments-compliance-roadmap.md）');
  err.code = 'PAYMENTS_NOT_IMPLEMENTED';
  return err;
}

export const payments = {
  /** 创建托管支付意图（PSP token 化，平台不接触卡数据） */
  async createPaymentIntent(/* { orderId, amount, currency, buyerId } */) {
    throw notImplemented('createPaymentIntent');
  },
  /** 托管：买家付款后资金冻结，等待签收释放 */
  async holdFunds(/* paymentId */) {
    throw notImplemented('holdFunds');
  },
  /** 签收后释放给卖家（扣除平台佣金与保险保费） */
  async releaseFunds(/* paymentId, sellerId, commissions */) {
    throw notImplemented('releaseFunds');
  },
  /** 退款 / 拒付处理 */
  async refund(/* paymentId, reason */) {
    throw notImplemented('refund');
  },
  /** 每日对账与结算报表 */
  async reconciliation(/* date */) {
    throw notImplemented('reconciliation');
  },
  /** 打赏结算（双方可见，走 PSP 分账） */
  async settleTip(/* tipId */) {
    throw notImplemented('settleTip');
  }
};
