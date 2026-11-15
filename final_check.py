from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda x:errors.append(str(x)))
 page.route('https://server.arcgisonline.com/**',lambda r:r.abort())
 page.set_content((root/'index.html').read_text(),wait_until='domcontentloaded',timeout=90000)
 page.wait_for_timeout(600)
 page.locator('#home').screenshot(path=str(root/'preview_abertura.png'))
 for label,target in [('mapa','#atlas'),('calendario','#calendar'),('harmonizacao','#lab')]:
  page.locator(target).screenshot(path=str(root/f'preview_{label}.png'),timeout=45000)
  print(label, 'ok')
 print('HEADER computed',page.locator('#topbar').evaluate("e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color})"))
 page.locator('#btnTheme').click();page.wait_for_timeout(350)
 print('DARK',page.evaluate('document.documentElement.dataset.theme'),page.locator('#topbar').evaluate('e=>getComputedStyle(e).color'))
 page.locator('#btnTheme').click()
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(450)
 page.locator('#atlas').screenshot(path=str(root/'preview_celular.png'),timeout=45000)
 print('MOBILE OVERFLOW',page.evaluate('document.documentElement.scrollWidth>window.innerWidth+2'),'JSERRORS',errors)
 assert not errors
 assert not page.evaluate('document.documentElement.scrollWidth>window.innerWidth+2')
 b.close()
