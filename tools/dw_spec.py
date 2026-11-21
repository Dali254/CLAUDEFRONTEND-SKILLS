# DreamWork reference sizes, measured from 1080px screenshots of a 412px-wide phone (÷2.625). CSS px.
# (page, selector, property, target)   property: fs=font-size, h=height, w=width
SPEC = [
 ('dashboard','.sr-topbar__bar','h',51), ('dashboard','.sr-topbar .sr-logo__mark','w',28), ('dashboard','.sr-topbar .sr-logo__word','fs',14.1),
 ('dashboard','.sr-greet__avatar','w',44), ('dashboard','.sr-greet__date','fs',12.5), ('dashboard','.sr-greet__hello','fs',19.8),
 ('dashboard','.sr-balance__actions .sr-btn','h',40), ('dashboard','.sr-balance__actions .sr-btn','fs',14), ('dashboard','.sr-balance__label','fs',12.5), ('dashboard','.sr-balance__amount','fs',33.9),
 ('dashboard','.sr-stat','h',82), ('dashboard','.sr-stat__icon','w',36), ('dashboard','.sr-stat__label','fs',15.1), ('dashboard','.sr-stat__value','fs',23.5), ('dashboard','.sr-stat__hint','fs',12.5), ('dashboard','.sr-stat__hint','h',28),
 ('dashboard','.sr-quick__icon','w',52),
 ('dashboard','.sr-tile','h',79), ('dashboard','.sr-tile .sr-glyph','w',44), ('dashboard','.sr-tile__tag','fs',8.9), ('dashboard','.sr-tile__name','fs',15.1), ('dashboard','.sr-tile__desc','fs',11), ('dashboard','.sr-tile__v','fs',15.1), ('dashboard','.sr-tile .sr-go','w',30),
 ('dashboard','.sr-reward','h',147), ('dashboard','.sr-reward__coin','w',34), ('dashboard','.sr-reward__label','fs',12.5), ('dashboard','.sr-reward__value','fs',18.3), ('dashboard','.sr-reward__sub','fs',11),
 ('dashboard','.sr-tabbar','h',55), ('dashboard','.sr-tab','fs',9.4),
 ('dashboard','.sr-panel__title','fs',14.6), ('dashboard','.sr-row__title','fs',13), ('dashboard','.sr-row__meta','fs',11),
 ('dashboard','.sr-drawer','w',241), ('dashboard','.sr-drawer .sr-side-profile','h',52), ('dashboard','.sr-drawer .sr-nav-link','h',40), ('dashboard','.sr-drawer .sr-nav-link__icon','w',26), ('dashboard','.sr-drawer .sr-nav-link__label','fs',13), ('dashboard','.sr-drawer .sr-nav-section','fs',8.9),
 ('pages','.sr-page-hero','h',124), ('pages','.sr-page-hero .sr-glyph','w',44), ('pages','.sr-page-hero__kicker','fs',8.9), ('pages','.sr-page-hero__title','fs',19.8), ('pages','.sr-page-hero__text','fs',12.5),
 ('pages','.sr-earn-card__label','fs',12.5), ('pages','.sr-linkbox','h',37), ('pages','.sr-linkbox .sr-btn','h',27),
 ('login','.sr-auth__title','fs',25.6), ('login','.sr-auth__sub','fs',13), ('login','.sr-label','fs',11.5), ('login','.sr-input','h',41), ('login','.sr-input','fs',14.6), ('login','.sr-auth__form .sr-btn--primary','h',43), ('login','.sr-auth__form .sr-btn--primary','fs',14.6),
 ('register','.sr-auth__badge','w',56), ('register','.sr-auth__title','fs',25.6), ('register','.sr-hint','fs',12.5),
  ('dashboard','.sr-tile__k','fs',8.4), ('dashboard','#pop-account .sr-menu-item','fs',13), ('dashboard','.sr-menu-head__name','fs',14.6), ('dashboard','.sr-drawer .sr-side-profile__name','fs',13),
  ('pages','.sr-level__v','fs',17.2), ('pages','.sr-linkbox .sr-btn','fs',13), ('pages','.sr-earn-card__value','fs',19.3),
]
