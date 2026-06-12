'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import s from './landing.module.css'

// Reveal-on-scroll: same idea as the mockup's IntersectionObserver.
// CSS already shows everything when prefers-reduced-motion is set, so this is purely additive.
function useScrollReveal() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const els = root.current?.querySelectorAll(`.${s.reveal}`)
    if (!els || els.length === 0) return
    const io = new IntersectionObserver(
      entries =>
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add(s.revealIn)
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
  return root
}

export default function LandingPage() {
  const root = useScrollReveal()

  return (
    <div className={s.root} ref={root}>
      {/* NAV */}
      <nav className={s.nav}>
        <div className={`${s.wrap} ${s.navInner}`}>
          <div className={s.brand}>
            <span className={s.mark}>P</span> Pennyworth <span className={s.mark2}>× Ecomdy</span>
          </div>
          <div className={s.navlinks}>
            <a href="#how">Cách hoạt động</a>
            <a href="#features">Tính năng</a>
            <a href="#demo">Vì sao</a>
            <a href="#team">Về team</a>
          </div>
          <Link className={`${s.btn} ${s.btnRed}`} href="/kols/engine" style={{ height: 38, fontSize: 13.5, padding: '0 16px' }}>
            Thử demo
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header className={s.hero}>
        <div className={s.glow} />
        <div className={s.wrap}>
          <span className={s.pill}>
            <span className={s.pdot} /> Powered by <b>Ecomdy</b> · TikTok Shop US
          </span>
          <h1 className={s.ht}>
            Tìm đúng KOL bán được hàng trên <span className={s.accent}>TikTok Shop</span>
          </h1>
          <p className={s.hsub}>
            Nhập brief campaign — engine AI 3 lớp trả shortlist creator phù hợp nhất, kèm điểm minh bạch
            và lý do nên / không nên chọn. Vài giây, thay vì vài ngày.
          </p>
          <div className={s.cta}>
            <Link className={`${s.btn} ${s.btnRed}`} href="/kols/engine">Thử demo miễn phí →</Link>
            <a className={`${s.btn} ${s.btnGhost}`} href="#how">Xem cách hoạt động</a>
          </div>
          <p className={s.micro}>Không black-box · giải thích được từng quyết định · tối ưu cho conversion</p>

          {/* PRODUCT SHOT */}
          <div className={`${s.shot} ${s.reveal}`}>
            <div className={s.frame}>
              <div className={s.bar}>
                <i /><i /><i />
                <span className={s.url}>app.pennyworth.ai/kols/engine</span>
              </div>
              <div className={s.frameBody}>
                <div className={s.fbL}>
                  <div className={s.mlabel}>Brand</div>
                  <div className={s.minp}>Diana</div>
                  <div className={s.mlabel}>Niche · Platform</div>
                  <div className={s.minp}>Feminine care · TikTok Shop US</div>
                  <div className={s.mlabel}>Audience · Budget</div>
                  <div className={s.minp}>Nữ 18–24 · $50K</div>
                  <div className={s.mbtn}>Tìm KOL phù hợp</div>
                </div>
                <div className={s.fbR}>
                  <div className={s.rc}>
                    <div className={s.rcTop}>
                      <div className={s.ring}>
                        <svg width="50" height="50">
                          <circle cx="25" cy="25" r="21" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
                          <circle cx="25" cy="25" r="21" fill="none" stroke="#37d399" strokeWidth="5" strokeLinecap="round" strokeDasharray="132" strokeDashoffset="20" />
                        </svg>
                        <div className={s.ringV}><b>8.5</b><small>/10</small></div>
                      </div>
                      <div>
                        <span className={s.vbadge}>Strong fit</span>
                        <div className={s.vhead}>Đúng tệp nữ 18–24, niche beauty sát sản phẩm, conversion-oriented.</div>
                      </div>
                    </div>
                    <div className={s.rcWhy}>
                      <div className={`${s.wbox} ${s.wboxG}`}><b>✓ Vì sao phù hợp</b>Audience 82% nữ 18–24 · affiliate TikTok Shop tốt</div>
                      <div className={`${s.wbox} ${s.wboxB}`}><b>! Cần cân nhắc</b>Reach 1.8M — ghép thêm micro KOL để scale</div>
                    </div>
                    <div className={s.rcBars}>
                      <div className={s.bl}><span>Niche</span><div className={s.tk}><div className={s.fl} style={{ width: '96%' }} /></div></div>
                      <div className={s.bl}><span>Audience</span><div className={s.tk}><div className={s.fl} style={{ width: '95%' }} /></div></div>
                      <div className={s.bl}><span>Engagement</span><div className={s.tk}><div className={s.fl} style={{ width: '93%' }} /></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TRUST */}
      <div className={s.trust}>
        <div className={s.wrap}>
          <p>Đối tác qua chương trình VentureX 2026</p>
          <div className={s.badges}>
            <span>Ecomdy</span><span>TikTok Shop</span><span>VentureX</span><span>Pennyworth</span>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how" className={s.section}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>Cách hoạt động</p>
          <h2 className={s.h2}>Một engine, ba lớp xử lý</h2>
          <p className={s.ssub}>Tìm nhanh → chấm điểm minh bạch → giải thích bằng AI agent tự research web.</p>
          <div className={s.how}>
            <div className={`${s.hc} ${s.reveal}`}>
              <div className={s.hn}>01 / Retrieval</div>
              <h3>Semantic search</h3>
              <p>Brief → embedding → lọc hàng nghìn creator xuống top ứng viên khả thi trong mili-giây.</p>
            </div>
            <div className={`${s.hc} ${s.reveal}`}>
              <div className={s.hn}>02 / Scoring</div>
              <h3>Weighted scoring</h3>
              <p>7 chiều (niche, platform, audience, engagement, commerce…) — mỗi điểm giải thích được.</p>
            </div>
            <div className={`${s.hc} ${s.reveal}`}>
              <div className={s.hn}>03 / Explanation</div>
              <h3>AI agent research</h3>
              <p>Agent tự search web kiểm scandal, audience, brand deal → lý do nên / không nên chọn.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — bento with real UI */}
      <section id="features" className={`${s.section} ${s.sectionAlt}`}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>Tính năng</p>
          <h2 className={s.h2}>Thấy cả quá trình, không chỉ kết quả</h2>
          <div className={s.bento}>
            <div className={`${s.bc} ${s.reveal}`}>
              <div className={s.pad}>
                <h4>Pipeline minh bạch</h4>
                <p>Theo dõi engine lọc ứng viên qua từng lớp — ai còn lại sau mỗi bước.</p>
              </div>
              <div className={s.bcUi}>
                <div className={s.pipe}>
                  <div className={`${s.pstep} ${s.pstepA}`}><div className={s.pn}>Layer 1</div><div className={s.pc}>22</div></div>
                  <span className={s.parr}>→</span>
                  <div className={`${s.pstep} ${s.pstepB}`}><div className={s.pn}>Layer 2</div><div className={s.pc}>5</div></div>
                  <span className={s.parr}>→</span>
                  <div className={`${s.pstep} ${s.pstepC}`}><div className={s.pn}>Layer 3</div><div className={s.pc}>5</div></div>
                </div>
              </div>
            </div>
            <div className={`${s.bc} ${s.reveal}`}>
              <div className={s.pad}>
                <h4>Loại có lý do</h4>
                <p>Ứng viên bị loại đều kèm lý do rõ ràng, không phải hộp đen.</p>
              </div>
              <div className={s.bcUi}>
                <div className={s.chiprow}>
                  <div className={s.crow}><span className={s.cn}>MiMi Beauty</span><span className={`${s.ctag} ${s.ctagK}`}>#1 · 78pts</span></div>
                  <div className={`${s.crow} ${s.crowCut}`}><span className={s.cn}>Mega Star Vy</span><span className={`${s.ctag} ${s.ctagX}`}>vượt budget</span></div>
                  <div className={`${s.crow} ${s.crowCut}`}><span className={s.cn}>GymBro Khoa</span><span className={`${s.ctag} ${s.ctagX}`}>audience lệch</span></div>
                </div>
              </div>
            </div>
            <div className={`${s.bc} ${s.reveal}`}>
              <div className={s.pad}>
                <h4>Agent tự research</h4>
                <p>Mỗi ứng viên một agent search web kiểm brand-safety trước khi gợi ý.</p>
              </div>
              <div className={s.bcUi}>
                <div className={s.term}>
                  <div><span className={s.termQ}>🔍 scandal MiMi Beauty</span> <span className={s.termOk}>→ ✓ clean</span></div>
                  <div><span className={s.termQ}>🔍 affiliate TikTok Shop results</span> <span className={s.termOk}>→ ✓</span></div>
                  <div><span className={s.termQ}>🔍 audience female 18-24</span> <span className={s.termOk}>→ ✓</span></div>
                </div>
              </div>
            </div>
            <div className={`${s.bc} ${s.reveal}`}>
              <div className={s.pad}>
                <h4>Tối ưu cho doanh số</h4>
                <p>Chấm theo khả năng chuyển đổi (GMV, affiliate), không chỉ followers.</p>
              </div>
              <div className={s.bcUi}>
                <div className={s.rcBars} style={{ padding: 0 }}>
                  <div className={s.bl}><span>Conversion</span><div className={s.tk}><div className={s.fl} style={{ width: '88%' }} /></div></div>
                  <div className={s.bl}><span>GMV history</span><div className={s.tk}><div className={s.fl} style={{ width: '74%' }} /></div></div>
                  <div className={s.bl}><span>Live-selling</span><div className={s.tk}><div className={s.fl} style={{ width: '69%' }} /></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="demo" className={s.section}>
        <div className={s.wrap}>
          <div className={s.statband}>
            <div className={`${s.st} ${s.reveal}`}><div className={`${s.stB} ${s.stCy}`}>~5s</div><div className={s.stC}>thay cho 2–5 ngày làm tay</div></div>
            <div className={`${s.st} ${s.reveal}`}><div className={s.stB}>7</div><div className={s.stC}>tín hiệu chấm điểm</div></div>
            <div className={`${s.st} ${s.reveal}`}><div className={`${s.stB} ${s.stRd}`}>3</div><div className={s.stC}>lớp: retrieve · score · explain</div></div>
            <div className={`${s.st} ${s.reveal}`}><div className={`${s.stB} ${s.stCy}`}>0</div><div className={s.stC}>black-box — giải thích 100%</div></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={`${s.ctabox} ${s.reveal}`}>
            <div className={s.ctaboxInner}>
              <h2 className={s.h2} style={{ color: '#fff' }}>Sẵn sàng tìm KOL thật sự bán được hàng?</h2>
              <p className={s.ssub}>Nhập một brief và xem engine làm việc. Không cần setup, không cần thẻ.</p>
              <div className={s.cta} style={{ marginTop: 26 }}>
                <Link className={`${s.btn} ${s.btnRed}`} href="/kols/engine">Thử demo →</Link>
                <a className={`${s.btn} ${s.btnGhost}`} href="#team">Liên hệ team</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="team" className={s.footer}>
        <div className={`${s.wrap} ${s.foot}`}>
          <div className={s.brand}>
            <span className={s.mark}>P</span> Pennyworth <span className={s.mark2}>× Ecomdy</span>
          </div>
          <div>VentureX 2026 · AI KOL Matching cho TikTok Shop US</div>
        </div>
      </footer>
    </div>
  )
}
