(function () {
  var C = window.CONFIG, eth = window.ethereum;
  var TR = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', CLAIM = '0x4e71d92d';
  var Chain = window.Chain = { account: null, bal: null, onChange: function () {} };
  function pad(a) { return a.replace(/^0x/, '').toLowerCase().padStart(64, '0'); }
  function req(m, p) { return eth.request({ method: m, params: p || [] }); }
  function dec() { return BigInt(C.TOKEN_DECIMALS || 18); }
  Chain.live = function () { return !!(C.TOKEN_ADDRESS && C.RECEIVER && C.CHAIN && C.CHAIN.id); };
  Chain.err = function (e) { if (e && e.code === 4001) return 'Cancelled'; return (e && e.message ? e.message : String(e)).slice(0, 90); };
  Chain.fmt = function () { return Chain.bal === null ? '-' : (Chain.bal / (10n ** dec())).toString(); };

  async function switchChain() {
    var id = '0x' + C.CHAIN.id.toString(16);
    try { await req('wallet_switchEthereumChain', [{ chainId: id }]); }
    catch (e) {
      if (e.code !== 4902 && e.code !== -32603) throw e;
      await req('wallet_addEthereumChain', [{ chainId: id, chainName: C.CHAIN.name, nativeCurrency: C.CHAIN.currency, rpcUrls: [C.CHAIN.rpc], blockExplorerUrls: C.CHAIN.explorer ? [C.CHAIN.explorer] : [] }]);
    }
  }
  async function refresh() {
    if (!Chain.account) return;
    try { Chain.bal = BigInt(await req('eth_call', [{ to: C.TOKEN_ADDRESS, data: '0x70a08231' + pad(Chain.account) }, 'latest'])); }
    catch (e) { Chain.bal = null; }
    Chain.onChange();
  }
  async function wait(h) {
    for (var i = 0; i < 60; i++) {
      var r = await req('eth_getTransactionReceipt', [h]);
      if (r) return r;
      await new Promise(function (f) { setTimeout(f, 2000); });
    }
    throw new Error('Still pending. Check your wallet.');
  }
  async function send(data) {
    await switchChain();
    return req('eth_sendTransaction', [{ from: Chain.account, to: C.TOKEN_ADDRESS, data: data }]);
  }

  Chain.connect = async function () {
    if (!eth) throw new Error('No wallet found. Open this site in a wallet browser or install MetaMask.');
    var a = await req('eth_requestAccounts');
    await switchChain();
    Chain.account = a[0]; await refresh();
  };
  Chain.init = async function () {
    if (!eth || !Chain.live()) return;
    try {
      var a = await req('eth_accounts');
      if (a.length) { Chain.account = a[0]; await refresh(); }
      eth.on('accountsChanged', function (x) { Chain.account = x[0] || null; Chain.bal = null; refresh(); Chain.onChange(); });
      eth.on('chainChanged', function () { refresh(); });
    } catch (e) {}
  };
  Chain.pay = async function (whole) {
    if (!Chain.account) throw new Error('Connect your wallet first');
    var amt = BigInt(whole) * 10n ** dec();
    if (Chain.bal !== null && Chain.bal < amt) throw new Error('Not enough ' + C.TOKEN_SYMBOL);
    var rc = await wait(await send('0xa9059cbb' + pad(C.RECEIVER) + amt.toString(16).padStart(64, '0')));
    var ok = rc.status === '0x1' && rc.logs.some(function (l) {
      return l.address.toLowerCase() === C.TOKEN_ADDRESS.toLowerCase() && l.topics[0] === TR &&
        l.topics[1] === '0x' + pad(Chain.account) && l.topics[2] === '0x' + pad(C.RECEIVER) && BigInt(l.data) >= amt;
    });
    await refresh();
    if (!ok) throw new Error('Payment not confirmed');
  };
  Chain.claim = async function () {
    if (!Chain.account) throw new Error('Connect your wallet first');
    var rc = await wait(await send(CLAIM));
    await refresh();
    if (rc.status !== '0x1') throw new Error('Claim failed. Try again in 24h.');
  };
})();
